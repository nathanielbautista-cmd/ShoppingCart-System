const crypto = require('crypto');
const { db } = require('../config/db');

const DATE_KEY = /(?:At|Date|Expires)$/;
const createId = () => crypto.randomBytes(12).toString('hex');

const reviveDates = (value, key = '') => {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map((entry) => reviveDates(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(
      ([childKey, child]) => [childKey, reviveDates(child, childKey)]
    ));
  }
  if (typeof value === 'string' && DATE_KEY.test(key)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
};

const clone = (value) => reviveDates(JSON.parse(JSON.stringify(value)));

const getValues = (source, path) => {
  let values = [source];
  for (const part of String(path).split('.')) {
    values = values.flatMap((value) => {
      if (Array.isArray(value)) return value.flatMap((item) => item?.[part]);
      return value == null ? [] : [value[part]];
    });
  }
  return values;
};

const getPath = (source, path) => String(path).split('.').reduce(
  (value, part) => value == null ? undefined : value[part],
  source
);

const comparable = (value) => value instanceof Date ? value.getTime() : value;
const equals = (left, right) => {
  if (left instanceof Date || right instanceof Date) {
    return new Date(left).getTime() === new Date(right).getTime();
  }
  return String(left) === String(right);
};

const matchesCondition = (values, condition) => {
  const candidates = values.length ? values : [undefined];
  if (condition instanceof RegExp) {
    return candidates.some((value) => condition.test(String(value ?? '')));
  }
  if (!condition || typeof condition !== 'object' || condition instanceof Date || Array.isArray(condition)) {
    return candidates.some((value) => equals(value, condition));
  }
  return Object.entries(condition).every(([operator, expected]) => {
    if (operator === '$regex') {
      const expression = expected instanceof RegExp ? expected : new RegExp(expected, condition.$options || '');
      return candidates.some((value) => expression.test(String(value ?? '')));
    }
    if (operator === '$options') return true;
    if (operator === '$ne') return candidates.every((value) => !equals(value, expected));
    if (operator === '$in') return candidates.some((value) => expected.some((entry) => equals(value, entry)));
    if (operator === '$nin') return candidates.every((value) => !expected.some((entry) => equals(value, entry)));
    if (operator === '$gte') return candidates.some((value) => comparable(value) >= comparable(expected));
    if (operator === '$gt') return candidates.some((value) => comparable(value) > comparable(expected));
    if (operator === '$lte') return candidates.some((value) => comparable(value) <= comparable(expected));
    if (operator === '$lt') return candidates.some((value) => comparable(value) < comparable(expected));
    return false;
  });
};

const matches = (document, filter = {}) => Object.entries(filter).every(([field, condition]) => {
  if (field === '$or') return condition.some((entry) => matches(document, entry));
  if (field === '$and') return condition.every((entry) => matches(document, entry));
  if (condition && typeof condition === 'object' && '$elemMatch' in condition) {
    const array = getPath(document, field);
    return Array.isArray(array) && array.some((entry) => matches(entry, condition.$elemMatch));
  }
  return matchesCondition(getValues(document, field), condition);
});

const setPath = (target, path, value) => {
  const parts = String(path).split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = clone(value);
};

const applyUpdate = (document, update, options = {}) => {
  for (const [path, value] of Object.entries(update.$set || {})) {
    const positional = path.match(/^([^.]*)\.\$\[([^\]]+)\]\.(.+)$/);
    if (!positional) {
      setPath(document, path, value);
      continue;
    }
    const [, arrayField, alias, remainder] = positional;
    const arrayFilter = (options.arrayFilters || []).find((entry) =>
      Object.keys(entry).some((key) => key.startsWith(`${alias}.`))
    ) || {};
    const normalizedFilter = Object.fromEntries(Object.entries(arrayFilter).map(
      ([key, expected]) => [key.slice(alias.length + 1), expected]
    ));
    for (const entry of document[arrayField] || []) {
      if (matches(entry, normalizedFilter)) setPath(entry, remainder, value);
    }
  }
  for (const [path, amount] of Object.entries(update.$inc || {})) {
    setPath(document, path, Number(getValues(document, path)[0] || 0) + Number(amount));
  }
  for (const [path, value] of Object.entries(update.$push || {})) {
    if (!Array.isArray(getPath(document, path))) setPath(document, path, []);
    getPath(document, path).push(clone(value));
  }
  for (const [path, condition] of Object.entries(update.$pull || {})) {
    const array = getPath(document, path);
    if (Array.isArray(array)) setPath(document, path, array.filter((entry) => !matches(entry, condition)));
  }
  if (!Object.keys(update).some((key) => key.startsWith('$'))) Object.assign(document, clone(update));
  return document;
};

const compareBy = (specification) => (left, right) => {
  for (const [field, direction] of Object.entries(specification || {})) {
    const a = comparable(getValues(left, field)[0]);
    const b = comparable(getValues(right, field)[0]);
    if (a === b) continue;
    if (a == null) return -1 * direction;
    if (b == null) return 1 * direction;
    return (a > b ? 1 : -1) * direction;
  }
  return 0;
};

const project = (document, specification) => {
  if (!specification) return clone(document);
  const tokens = typeof specification === 'string'
    ? specification.split(/\s+/).filter(Boolean)
    : Object.entries(specification).map(([field, included]) => included ? field : `-${field}`);
  const included = tokens.filter((token) => !token.startsWith('-') && !token.startsWith('+'));
  if (included.length) {
    const result = { _id: document._id };
    for (const field of included) {
      const value = getValues(document, field)[0];
      if (value !== undefined) setPath(result, field, value);
    }
    return result;
  }
  const result = clone(document);
  for (const token of tokens.filter((entry) => entry.startsWith('-'))) delete result[token.slice(1)];
  return result;
};

class Query {
  constructor(executor, { many = false } = {}) {
    this.executor = executor;
    this.many = many;
    this.sortSpec = null;
    this.limitCount = null;
    this.selectSpec = null;
    this.asLean = false;
  }
  sort(specification) { this.sortSpec = specification; return this; }
  limit(count) { this.limitCount = Math.max(0, Number(count) || 0); return this; }
  select(specification) { this.selectSpec = specification; return this; }
  lean() { this.asLean = true; return this; }
  async execute() {
    let result = await this.executor();
    if (this.many) {
      if (this.sortSpec) result.sort(compareBy(this.sortSpec));
      if (this.limitCount !== null) result = result.slice(0, this.limitCount);
      if (this.asLean || this.selectSpec) result = result.map((entry) => project(entry, this.selectSpec));
      return result;
    }
    return result && this.asLean ? project(result, this.selectSpec) : result;
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  catch(reject) { return this.execute().catch(reject); }
  finally(handler) { return this.execute().finally(handler); }
}

const evaluateExpression = (document, expression) => {
  if (typeof expression === 'string' && expression.startsWith('$')) return getValues(document, expression.slice(1))[0];
  if (expression && expression.$dateToString) {
    const date = new Date(evaluateExpression(document, expression.$dateToString.date));
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: expression.$dateToString.timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  return expression;
};

const aggregateDocuments = (input, pipeline) => {
  let rows = input.map(clone);
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matches(row, stage.$match));
    else if (stage.$unwind) {
      const path = String(stage.$unwind).replace(/^\$/, '');
      rows = rows.flatMap((row) => (getPath(row, path) || []).map((entry) => {
        const copy = clone(row);
        setPath(copy, path, entry);
        return copy;
      }));
    } else if (stage.$group) {
      const groups = new Map();
      for (const row of rows) {
        const id = evaluateExpression(row, stage.$group._id);
        const key = JSON.stringify(id);
        if (!groups.has(key)) groups.set(key, { _id: id });
        const result = groups.get(key);
        for (const [field, accumulator] of Object.entries(stage.$group)) {
          if (field === '_id') continue;
          if ('$sum' in accumulator) result[field] = (result[field] || 0) + Number(evaluateExpression(row, accumulator.$sum) || 0);
          else if ('$min' in accumulator) {
            const value = evaluateExpression(row, accumulator.$min);
            if (result[field] === undefined || comparable(value) < comparable(result[field])) result[field] = value;
          } else if ('$first' in accumulator && result[field] === undefined) result[field] = evaluateExpression(row, accumulator.$first);
        }
      }
      rows = [...groups.values()];
    } else if (stage.$sort) rows.sort(compareBy(stage.$sort));
    else if (stage.$project) {
      rows = rows.map((row) => {
        const result = {};
        for (const [field, expression] of Object.entries(stage.$project)) {
          if (expression === 0) continue;
          result[field] = expression === 1 ? row[field] : evaluateExpression(row, expression);
        }
        return result;
      });
    }
  }
  return rows;
};

const createSqliteModel = ({ collection, defaults = {}, uniqueFields = [], hiddenFields = [], prepare = async () => {}, validate = () => {}, methods = {}, attach = () => {} }) => {
  const selectRows = db.prepare('SELECT data FROM documents WHERE collection = ?');
  const selectRow = db.prepare('SELECT data FROM documents WHERE collection = ? AND id = ?');
  const upsertRow = db.prepare(`
    INSERT INTO documents (collection, id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  const deleteRow = db.prepare('DELETE FROM documents WHERE collection = ? AND id = ?');

  class Document {
    constructor(data) {
      Object.assign(this, reviveDates(data));
      Object.defineProperty(this, '__original', { value: JSON.stringify(data), writable: true, enumerable: false });
      for (const [name, method] of Object.entries(methods)) Object.defineProperty(this, name, { value: method.bind(this), enumerable: false });
      Object.defineProperty(this, 'save', { value: this.save.bind(this), enumerable: false });
      attach(this);
    }
    async save(options = {}) {
      const original = reviveDates(JSON.parse(this.__original));
      attach(this);
      await prepare(this, { original, isNew: !selectRow.get(collection, this._id), options });
      validate(this, options);
      const now = new Date();
      if (!this.createdAt) this.createdAt = now;
      this.updatedAt = now;
      Model._assertUnique(this);
      Model._persist(this);
      this.__original = JSON.stringify(this);
      attach(this);
      return this;
    }
    toJSON() {
      const result = clone(Object.fromEntries(Object.entries(this)));
      for (const field of hiddenFields) delete result[field];
      return result;
    }
  }

  class Model {
    static _hydrate(data) { return data ? new Document(data) : null; }
    static _all() { return selectRows.all(collection).map((row) => Model._hydrate(JSON.parse(row.data))); }
    static _persist(document) {
      const json = JSON.stringify(Object.fromEntries(Object.entries(document)));
      upsertRow.run(collection, document._id, json, new Date(document.createdAt).toISOString(), new Date(document.updatedAt).toISOString());
    }
    static _assertUnique(document) {
      for (const field of uniqueFields) {
        if (document[field] == null) continue;
        const duplicate = Model._all().find((entry) => entry._id !== document._id && equals(entry[field], document[field]));
        if (duplicate) {
          const error = new Error(`${field} must be unique`);
          error.code = 11000;
          throw error;
        }
      }
    }
    static find(filter = {}) { return new Query(async () => Model._all().filter((entry) => matches(entry, filter)), { many: true }); }
    static findOne(filter = {}) { return new Query(async () => Model._all().find((entry) => matches(entry, filter)) || null); }
    static findById(id) { return new Query(async () => {
      const row = selectRow.get(collection, String(id));
      return row ? Model._hydrate(JSON.parse(row.data)) : null;
    }); }
    static async create(data) {
      const now = new Date();
      const document = Model._hydrate({ ...clone(defaults), ...clone(data), _id: data._id || createId(), createdAt: data.createdAt || now, updatedAt: data.updatedAt || now });
      return document.save();
    }
    static async insertMany(rows) { return Promise.all(rows.map((row) => Model.create(row))); }
    static async findOneAndUpdate(filter, update, options = {}) {
      return db.transaction(() => {
        const document = Model._all().find((entry) => matches(entry, filter));
        if (!document) return null;
        applyUpdate(document, update, options);
        validate(document, options);
        document.updatedAt = new Date();
        Model._assertUnique(document);
        Model._persist(document);
        document.__original = JSON.stringify(document);
        attach(document);
        return document;
      })();
    }
    static async findByIdAndUpdate(id, update, options = {}) { return Model.findOneAndUpdate({ _id: String(id) }, update, options); }
    static async findByIdAndDelete(id) {
      const current = await Model.findById(id);
      if (current) deleteRow.run(collection, String(id));
      return current;
    }
    static async deleteOne(filter = {}) {
      const current = Model._all().find((entry) => matches(entry, filter));
      return { deletedCount: current ? deleteRow.run(collection, current._id).changes : 0 };
    }
    static async deleteMany(filter = {}) {
      const documents = Model._all().filter((entry) => matches(entry, filter));
      const remove = db.transaction(() => documents.reduce((count, entry) => count + deleteRow.run(collection, entry._id).changes, 0));
      return { deletedCount: remove() };
    }
    static async countDocuments(filter = {}) { return Model._all().filter((entry) => matches(entry, filter)).length; }
    static async aggregate(pipeline = []) { return aggregateDocuments(Model._all(), pipeline); }
  }

  Model.collection = { dropIndex: async () => undefined };
  Model.Document = Document;
  return Model;
};

module.exports = { createSqliteModel, createId, matches };
