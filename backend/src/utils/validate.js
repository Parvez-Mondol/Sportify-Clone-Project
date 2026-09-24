const ApiError = require('./ApiError');

// Tiny declarative validator. Each rule: { type, required, min, max, enum, pattern }.
// Returns only the known fields, coerced to their declared type.
function validate(body, rules, { partial = false } = {}) {
  const out = {};
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    let value = body?.[field];
    if (value === undefined || value === null || value === '') {
      if (rule.required && !partial) errors[field] = 'is required';
      else if (value === null || value === '') out[field] = null;
      continue;
    }
    if (rule.type === 'string') {
      value = String(value).trim();
      if (rule.min && value.length < rule.min) errors[field] = `must be at least ${rule.min} characters`;
      else if (rule.max && value.length > rule.max) errors[field] = `must be at most ${rule.max} characters`;
      else if (rule.pattern && !rule.pattern.test(value)) errors[field] = rule.message || 'is invalid';
      else if (rule.enum && !rule.enum.includes(value)) errors[field] = `must be one of: ${rule.enum.join(', ')}`;
    } else if (rule.type === 'int') {
      value = Number(value);
      if (!Number.isInteger(value)) errors[field] = 'must be an integer';
      else if (rule.min !== undefined && value < rule.min) errors[field] = `must be >= ${rule.min}`;
      else if (rule.max !== undefined && value > rule.max) errors[field] = `must be <= ${rule.max}`;
    } else if (rule.type === 'bool') {
      if (value === true || value === 'true' || value === '1' || value === 1) value = true;
      else if (value === false || value === 'false' || value === '0' || value === 0) value = false;
      else errors[field] = 'must be a boolean';
    }
    if (!errors[field]) out[field] = value;
  }
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);
  return out;
}

function parseId(value, what = 'Resource') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.notFound(what);
  return id;
}

function pagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
}

module.exports = { validate, parseId, pagination };
