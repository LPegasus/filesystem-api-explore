const DATE_REGEXP = /^\/Date\((\d{13})\)\/$/;
const DATE_STRINGIFY = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.(\d*))?)Z$/;
const TYPES = {};
'Boolean,Number,String,Function,Array,Date,RegExp,Object,Error,Symbol'
  .replace(/[^, ]+/g, function(d) {
    TYPES['[object ' + d + ']'] = d.toLowerCase(); return void 0;
  });

export function stringifyReplacer(k, v) {
  debugger;
  if (typeof k !== 'string' || v === null || v === void 0
    || Object.is(NaN, v) || v === Infinity || v === -Infinity
    || getType(v) === 'function' || getType(v) === 'regexp'
  ) {
    return void 0;
  }
  if (getType(v) === 'symbol') {
    const symbolStr = v.toString();
    return `/Symbol(${v.toString().substr(7, symbolStr.length - 8)})/`;
  } else if (DATE_STRINGIFY.exec(v)) {
    return `/Date(${Date.UTC(+RegExp.$1, +RegExp.$2 - 1, +RegExp.$3, +RegExp.$4,
      +RegExp.$5, +RegExp.$6, +RegExp.$7)})/`;
  }
  return v;
}

export function parseReplacer(k, v) {
  const symbolRegExp = /^\/Symbol\((.+)\)\/$/;
  if (DATE_REGEXP.exec(v)) {
    return new Date(parseInt(RegExp.$1));
  } else if (symbolRegExp.exec(v)) {
    return Symbol.for(RegExp.$1);
  }
  return v;
}

export function getType(o) {
  if (o === null) return String(o);
  return typeof o === 'object' || typeof o === 'function' ?
    TYPES[Object.prototype.toString.call(o)] || 'object'
    : typeof o;
}

export function date2String(obj) {
  let value;
  for (let field in obj) {
    if (!obj.hasOwnProperty(field)) continue;
    value = obj[field];
    if (Object.prototype.toString.call(value).toLowerCase().indexOf('date') > -1) {
      obj[field] = `/Date(${value.valueOf()})/`;
    } else if (getType(value) === 'array' || getType(value) === 'object') {
      obj[field] = date2String(value);
    }
  }
  return obj;
}

export function string2Date(obj) {
  let value;
  for (let field in obj) {
    if (!obj.hasOwnProperty(field)) continue;
    value = obj[field];
    if (DATE_REGEXP.exec(value)) {
      value = RegExp.$1;
      obj[field] = new Date(parseInt(value));
    } else if (getType(value) === 'array' || getType(value) === 'object') {
      obj[field] = string2Date(value);
    }
  }
  return obj;
}

function Defer() {
  const _s = this;
  const p = new Promise((r, j) => {
    _s.resolve = r;
    _s.reject = j;
  });
  this.promise = p;
}

export function defer() {
  return new Defer();
}

export function jsonParse(d) {
  try {
    return JSON.parse(d, parseReplacer);
  } catch (e) {
    throw new Error('JSON Parse Error: ' + d.toString());
  }
}

export function jsonStringify(d, arg) {
  return JSON.stringify(d, stringifyReplacer, arg);
}
