import { ProdifyError } from '../core/errors.js';
function parseScalar(rawValue) {
    const value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        return value.slice(1, -1);
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (value === 'null') {
        return null;
    }
    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }
    return value;
}
function splitKeyValue(content, lineNumber) {
    const separatorIndex = content.indexOf(':');
    if (separatorIndex === -1) {
        throw new ProdifyError(`Invalid frontmatter at line ${lineNumber}: expected "key: value".`, {
            code: 'CONTRACT_FRONTMATTER_INVALID'
        });
    }
    const key = content.slice(0, separatorIndex).trim();
    if (!key) {
        throw new ProdifyError(`Invalid frontmatter at line ${lineNumber}: missing key before ":".`, {
            code: 'CONTRACT_FRONTMATTER_INVALID'
        });
    }
    return {
        key,
        value: content.slice(separatorIndex + 1).trim()
    };
}
function preprocessFrontmatter(frontmatter) {
    return frontmatter
        .split('\n')
        .map((line, index) => ({ raw: line.replace(/\r$/, ''), lineNumber: index + 1 }))
        .filter(({ raw }) => raw.trim() !== '' && !raw.trimStart().startsWith('#'))
        .map(({ raw, lineNumber }) => {
        const indent = raw.match(/^ */)?.[0].length ?? 0;
        if (indent % 2 !== 0) {
            throw new ProdifyError(`Invalid frontmatter indentation at line ${lineNumber}: use multiples of two spaces.`, {
                code: 'CONTRACT_FRONTMATTER_INVALID'
            });
        }
        return {
            indent,
            content: raw.trim(),
            lineNumber
        };
    });
}
function parseBlock(lines, state, indent) {
    const line = lines[state.index];
    if (!line || line.indent !== indent) {
        throw new ProdifyError(`Invalid frontmatter near line ${line?.lineNumber ?? 'EOF'}: unexpected indentation.`, {
            code: 'CONTRACT_FRONTMATTER_INVALID'
        });
    }
    if (line.content.startsWith('- ')) {
        return parseSequence(lines, state, indent);
    }
    return parseMapping(lines, state, indent);
}
function parseMapping(lines, state, indent) {
    const value = {};
    while (state.index < lines.length) {
        const line = lines[state.index];
        if (line.indent < indent) {
            break;
        }
        if (line.indent > indent) {
            throw new ProdifyError(`Invalid frontmatter at line ${line.lineNumber}: unexpected indentation.`, {
                code: 'CONTRACT_FRONTMATTER_INVALID'
            });
        }
        if (line.content.startsWith('- ')) {
            throw new ProdifyError(`Invalid frontmatter at line ${line.lineNumber}: sequence item is not valid here.`, {
                code: 'CONTRACT_FRONTMATTER_INVALID'
            });
        }
        const { key, value: rawValue } = splitKeyValue(line.content, line.lineNumber);
        state.index += 1;
        if (rawValue !== '') {
            value[key] = parseScalar(rawValue);
            continue;
        }
        const nextLine = lines[state.index];
        if (!nextLine || nextLine.indent <= indent) {
            throw new ProdifyError(`Invalid frontmatter at line ${line.lineNumber}: expected an indented block for "${key}".`, {
                code: 'CONTRACT_FRONTMATTER_INVALID'
            });
        }
        value[key] = parseBlock(lines, state, indent + 2);
    }
    return value;
}
function parseSequence(lines, state, indent) {
    const value = [];
    while (state.index < lines.length) {
        const line = lines[state.index];
        if (line.indent < indent) {
            break;
        }
        if (line.indent > indent) {
            throw new ProdifyError(`Invalid frontmatter at line ${line.lineNumber}: unexpected indentation.`, {
                code: 'CONTRACT_FRONTMATTER_INVALID'
            });
        }
        if (!line.content.startsWith('- ')) {
            break;
        }
        const inlineValue = line.content.slice(2).trim();
        state.index += 1;
        if (inlineValue === '') {
            const nextLine = lines[state.index];
            if (!nextLine || nextLine.indent <= indent) {
                throw new ProdifyError(`Invalid frontmatter at line ${line.lineNumber}: expected an indented sequence value.`, {
                    code: 'CONTRACT_FRONTMATTER_INVALID'
                });
            }
            value.push(parseBlock(lines, state, indent + 2));
            continue;
        }
        if (inlineValue.includes(':')) {
            const { key, value: rawValue } = splitKeyValue(inlineValue, line.lineNumber);
            const item = {};
            if (rawValue !== '') {
                item[key] = parseScalar(rawValue);
            }
            else {
                const nextLine = lines[state.index];
                if (!nextLine || nextLine.indent <= indent) {
                    throw new ProdifyError(`Invalid frontmatter at line ${line.lineNumber}: expected an indented block for "${key}".`, {
                        code: 'CONTRACT_FRONTMATTER_INVALID'
                    });
                }
                item[key] = parseBlock(lines, state, indent + 2);
            }
            if (state.index < lines.length && lines[state.index].indent > indent) {
                Object.assign(item, parseMapping(lines, state, indent + 2));
            }
            value.push(item);
            continue;
        }
        value.push(parseScalar(inlineValue));
    }
    return value;
}
function parseFrontmatter(frontmatter) {
    const lines = preprocessFrontmatter(frontmatter);
    if (lines.length === 0) {
        throw new ProdifyError('Contract source frontmatter is empty.', {
            code: 'CONTRACT_FRONTMATTER_INVALID'
        });
    }
    const state = { index: 0 };
    const parsed = parseBlock(lines, state, 0);
    if (state.index !== lines.length) {
        const nextLine = lines[state.index];
        throw new ProdifyError(`Invalid frontmatter at line ${nextLine.lineNumber}: trailing content could not be parsed.`, {
            code: 'CONTRACT_FRONTMATTER_INVALID'
        });
    }
    if (Array.isArray(parsed)) {
        throw new ProdifyError('Contract source frontmatter must be a mapping.', {
            code: 'CONTRACT_FRONTMATTER_INVALID'
        });
    }
    return parsed;
}
export function parseContractSource(markdown) {
    const normalized = markdown.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('---\n')) {
        throw new ProdifyError('Contract source must start with YAML frontmatter delimited by "---".', {
            code: 'CONTRACT_FRONTMATTER_MISSING'
        });
    }
    const closingIndex = normalized.indexOf('\n---\n', 4);
    if (closingIndex === -1) {
        throw new ProdifyError('Contract source frontmatter is not closed with "---".', {
            code: 'CONTRACT_FRONTMATTER_MISSING'
        });
    }
    const rawFrontmatter = normalized.slice(4, closingIndex);
    const body = normalized.slice(closingIndex + 5).trim();
    if (!body) {
        throw new ProdifyError('Contract source body is empty.', {
            code: 'CONTRACT_BODY_EMPTY'
        });
    }
    return {
        frontmatter: parseFrontmatter(rawFrontmatter),
        body
    };
}
