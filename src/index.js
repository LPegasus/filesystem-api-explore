import { defer } from './util';
import Commands from './commands';
import doms from './doms';

let lastValue = '';
const USER_NAME = 'tuanjie';
const EXECUTED_CMDS = [];
const cslPrefix = async () => {
  return `${USER_NAME}@ ~${await cmd.pwd()} > `;
}
lastValue = `${USER_NAME}@ ~/ > `;

let lastLine = '';

const csl = doms.csl;
csl.addEventListener('dblclick', function(e) {
  e.preventDefault();
  e.stopPropagation();
  lastLine = EXECUTED_CMDS[EXECUTED_CMDS.length - 1] || '';
  csl.value = csl.value + lastLine;
});
let lines = [];
let cmd;

const requestFileSystem = window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

async function getFile(fs, absolutePath, options = {}) {
  const q = defer();
  fs.root.getFile(absolutePath, options || {}, q.resolve, q.reject);
  return q.promise;
}

async function getFileOrCreate(fs, absolutePath) {
  const q = defer();
  fs.root.getFile(absolutePath, {}, q.resolve, e => {
    if (e.code === 8) {
      fs.root.getFile(absolutePath, { create: true }, q.resolve, q.reject)
    }
  });
  return q.promise;
}

requestFileSystem(0, 1024 * 1024 * 50, async f => {
  window._fs = f;
  cmd = new Commands(f);
  initAPP();
});

async function initAPP() {
  async function printLine() {
    lines.push((await cslPrefix()) + lastLine + '\n');
    await execCmd(lastLine.trim()).then(async output => {
      lines.push(output + '\n');
      const value = (lines.join('') + (await cslPrefix()));
      setTimeout(() => {
        csl.value = value;
        lastValue = value;
      }, 16);
    }).catch(async e => {
      lines.push('ERROR: ' + e.message + '\n');
      const value = lines.join('') + await cslPrefix();
      setTimeout(() => {
        csl.value = value;
        lastValue = value;
      }, 16);
    });
    lastLine = '';
  }

  function execCmd(command) {
    EXECUTED_CMDS.push(command);
    const args = [];
    let exeCommand = command.replace(/(['"]).+(\1)/g, v => {
      args.push(Array.from(v).slice(1, -1).join(''));
      return '';
    });

    const tmp = exeCommand.trim().split(/\s+/g);
    exeCommand = tmp.shift();

    args.push(...tmp);

    const commands = command.split(/\s+/);
    if (!exeCommand) {
      return Promise.resolve('');
    }

    if (exeCommand === 'clear') {
      lines = [];
      lastValue = `${USER_NAME}@ ~/ > `;
      return Promise.resolve('');
    }

    if (exeCommand in cmd) {
      return cmd[exeCommand](...args);
    } else {
      return Promise.resolve('ERROR: invalid cmd!');
    }
  }

  csl.focus();
  csl.addEventListener('keypress', e => {
    const charCode = e.charCode;
    /*
    lastLine += String.fromCharCode(charCode);
    if (charCode === 13) {
      printLine();
    }
    */

    if (charCode === 13) {
      lastLine = doms.csl.value.replace(lastValue, '');
      printLine();
    }
  });

  csl.value = await cslPrefix();
}

