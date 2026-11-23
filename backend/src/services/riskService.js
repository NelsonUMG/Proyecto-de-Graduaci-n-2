const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) => normalize(value).split(' ').filter((token) => token.length >= 3);

const keywordList = (level) => {
  if (Array.isArray(level.keywords)) return level.keywords;
  return String(level.keywords || level.palabrasClave || '')
    .split(/[\n,;]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
};

const editDistance = (left, right, limit = 3) => {
  if (left === right) return 0;
  if (!left || !right) return Math.max(left.length, right.length);
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMin = current[0];

    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[j]);
    }

    if (rowMin > limit) return limit + 1;
    previous = current;
  }

  return previous[right.length];
};

const allowedDistance = (token) => {
  if (token.length <= 4) return 1;
  if (token.length <= 7) return 2;
  return 3;
};

const isCloseToken = (expected, actual) => {
  if (expected === actual) return true;
  const singularExpected = expected.endsWith('s') ? expected.slice(0, -1) : expected;
  const singularActual = actual.endsWith('s') ? actual.slice(0, -1) : actual;
  if (singularExpected === singularActual) return true;

  const limit = allowedDistance(expected);
  return editDistance(expected, actual, limit) <= limit;
};

const findFuzzyKeyword = (textTokens, keyword) => {
  const keywordTokens = tokenize(keyword);
  if (!keywordTokens.length) return null;

  const matchedTokens = keywordTokens.map((keywordToken) => {
    const matched = textTokens.find((textToken) => isCloseToken(keywordToken, textToken));
    return matched ? { expected: keywordToken, actual: matched } : null;
  });

  if (matchedTokens.every(Boolean)) {
    const changed = matchedTokens.some((match) => match.expected !== match.actual);
    return {
      keyword,
      matchedText: matchedTokens.map((match) => match.actual).join(' '),
      matchType: changed ? 'aproximada' : 'exacta',
    };
  }

  return null;
};

const findKeywordMatch = (text, textTokens, keywords) => {
  const exact = keywords.find((keyword) => {
    const normalizedKeyword = normalize(keyword);
    return normalizedKeyword && text.includes(normalizedKeyword);
  });

  if (exact) {
    return { keyword: exact, matchedText: exact, matchType: 'exacta' };
  }

  return keywords.map((keyword) => findFuzzyKeyword(textTokens, keyword)).find(Boolean) || null;
};

const sortLevels = (levels = []) =>
  [...levels].sort((left, right) => Number(left.prioridad || left.id) - Number(right.prioridad || right.id));

const fallbackLevel = (levels) => {
  const ordered = sortLevels(levels);
  return ordered.find((level) => Number(level.prioridad) === 5)
    || levels.find((level) => Number(level.id) === 5)
    || ordered[ordered.length - 1]
    || null;
};

const buildResult = (level, match) => ({
  nivelRiesgoId: level ? Number(level.id) : 5,
  riesgo: level || null,
  tiempoAtencion: level?.tiempoAtencion || '',
  descripcion: level?.descripcion || '',
  matchedKeyword: match?.keyword || null,
  matchedText: match?.matchedText || null,
  matchType: match?.matchType || 'predeterminada',
});

const classifyTriage = ({ levels = [], symptoms = [], reason = '', nivelRiesgoId = null } = {}) => {
  const orderedLevels = sortLevels(levels).filter((level) => level.activo !== false);

  if (nivelRiesgoId) {
    const selected = orderedLevels.find((level) => Number(level.id) === Number(nivelRiesgoId));
    if (!selected) {
      const error = new Error('El nivel de riesgo seleccionado no existe o esta inactivo.');
      error.code = 'INVALID_RISK_LEVEL';
      throw error;
    }
    return buildResult(selected, { matchType: 'manual' });
  }

  const text = normalize([...symptoms, reason].join(' '));
  const textTokens = tokenize(text);

  for (const level of orderedLevels) {
    const match = findKeywordMatch(text, textTokens, keywordList(level));
    if (match) {
      return buildResult(level, match);
    }
  }

  return buildResult(fallbackLevel(orderedLevels), { matchType: 'predeterminada' });
};

const suggestRiskLevel = (levels, symptoms = [], reason = '') =>
  classifyTriage({ levels, symptoms, reason }).nivelRiesgoId;

module.exports = {
  classifyTriage,
  normalize,
  suggestRiskLevel,
};
