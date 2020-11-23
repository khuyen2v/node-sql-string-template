'use strict';

const assert = require('assert');

class Statement {
  constructor(sql, params) {
    this._sql = sql || '';
    this._params = params || [];
  }

  append(sql, ...params) {
    if (sql instanceof Statement) {
      const stmt = sql;
      this._sql += stmt._sql;
      if (stmt._params.length > 0)
        this._params.push(...stmt._params);
    } else {
      this._sql += sql;
      if (params.length > 0)
        this._params.push(...params);
    }
    return this;
  }
  
  pack() {
    return [this._sql, this._params];
  }

  spread() {
    return [this._sql, this._params];
  }

  rebind(params) {
    this._params = params;
    return this;
  }

  /**
   * @returns {string}
   */
  get sql() { return this._sql; }

  /**
   * @returns {any[]}
   */
  get params() { return this._params; }
}

/**
 * @param {string[]} strings 
 * @param  {...any} params 
 */
exports = module.exports = function (strings, ...args) {
  if (args.length == 0) {
    return new Statement(strings[0]);
  }
  const stmt = new Statement();
  for (let i = 0; i < args.length; ++i) {
    stmt.append(strings[i]);
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg instanceof Statement) {
      stmt.append(arg);
      continue;
    }
    if (typeof arg == 'function') {
      const ret = arg();
      assert(ret instanceof Statement);
      stmt.append(ret);
      continue;
    }
    stmt.append('?', arg);
  }
  stmt.append(strings[strings.length - 1]);
  return stmt;
}

exports.Statement = Statement;

exports.set = (values) => {
  assert(typeof values == 'object' && values !== null);
  const keys = Object.keys(values);
  assert(keys.length > 0);
  return new Statement(
    keys.map(k => (k + '=?')).join(', '),
    keys.map(k => values[k])
  );
};

exports.values = (values) => {
  assert(typeof values == 'object' && values !== null);
  const keys = Object.keys(values);
  assert(keys.length > 0);
  return new Statement(
    `(${keys.join(', ')}) values (${keys.map(() => '?').join(', ')})`,
    keys.map(k => values[k])
  );
};

exports.where = (values) => {
  assert(typeof values == 'object' && values !== null);
  const keys = Object.keys(values);
  assert(keys.length > 0);

  let where_values = [];
  let where_names =  keys.map(k => {
    if (Array.isArray(values[k])) {
      if (values[k].length === 2) {
        values.push(values[k][1]);
        return (k + values[k][0] + '?');
      } else {
        return "";
      }
    }

    values.push(values[k]);
    return (k + '=?')
  }).filter(item => item.length > 0).join(', ')

  return new Statement(
      where_names,
      where_values
  );
};

exports.echo = (values) => {
  assert(values === values.toString());
  return new Statement(values);
};

exports.join = (values) => {
  assert(Array.isArray(values));
  return new Statement(values.map(() => '?').join(', '), [...values]);
};