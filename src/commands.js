import { defer, date2String } from './util';
import doms from './doms';

let VI_ON = false;

function promisify(ctx, fnName) {
  return (...arg) => {
    const q = defer();
    ctx[fnName].apply(ctx, [...arg, q.resolve, q.reject]);
    return q.promise;
  }
}

async function getDirectoryOrCreate(dirEntry, path) {
  const q = defer();
  dirEntry.getDirectory(path, { create: true }, q.resolve, q.reject);
  return q.promise;
}

async function get(dirEntry, pathname) {
  let entry = null;
  try {
    entry = await promisify(dirEntry, 'getFile')(pathname, {});
  } catch (e) { }
  if (entry) return entry;

  try {
    entry = await promisify(dirEntry, 'getDirectory')(pathname, {});
  } catch (e) { }
  if (!entry) {
    throw new Error('no such file or directory');
  }

  return entry;
}

/**
 * 读取文件
 * 
 * @param {any} fileEntry 
 * @returns 
 */
async function readFile(fileEntry) {
  const q = defer();
  const reader = new FileReader();
  fileEntry.file(file => {
    reader.onloadend = function (e) {
      q.resolve(e.target.result);
    }

    reader.onerror = q.reject;
    reader.readAsText(file);
  }, q.reject);

  return q.promise;
}

/**
 * 写文件
 * 
 * @param {any} fileEntry 
 * @param {any} txt 
 * @returns 
 */
async function write(fileEntry, txt = '') {
  const q = defer();
  const fullname = fileEntry.fullPath;
  const root = fileEntry.filesystem.root;

  fileEntry.remove(() => {
    root.getFile(fullname, { create: true }, entry => {
      entry.createWriter(function (fileWriter) {
        fileWriter.onwriteend = function (e) {
          q.resolve(`${fileEntry.name} save successfully.`);
        }

        fileWriter.onerror = q.reject;

        const blob = new Blob([txt], { type: 'text/plain;charset=UTF-8', endings: 'native' });

        fileWriter.write(blob);
      }, q.reject);
    }), q.reject
  }, q.reject);

  return q.promise;
}

async function writeBlob(fileEntry, blob) {
  const q = defer();
  fileEntry.createWriter(fileWriter => {
    fileWriter.onwriteend = () => {
      q.resolve();
    }
    fileWriter.onerror = q.reject;

    fileWriter.write(blob);
  }, q.reject);
  return q.promise;
}

async function getAllEntry(dir) {
  const q = defer();
  dir.createReader().readEntries(q.resolve, q.reject);
  return q.promise;
}

async function getParent(dirEntry) {
  const q = defer();
  dirEntry.getParent(q.resolve);
  return q.promise;
}

export default class Commands {
  constructor(f) {
    this.fs = f;
    this.workingDir = f.root;
    this.workingFile = null;
    this.workingWorker = null;
  }
  /**
   * 支持的命令
   * 
   * @returns 
   * @memberof Commands
   */
  async help() {
    return Promise.resolve([
      'ls', 'mkdir', 'all', 'cd', 'rm', 'pwd', 'url', 'cat',
      'node', 'worker', 'workerPost', 'wget', 'save', 'open',
      'move'
    ].join('\t'));
  }

  async save(filename) {
    if (!filename) return 'Filename is not set';
    const q = defer();
    doms.upload.click();
    doms.upload.onchange = (e) => {
      if (e.target.files.length === 0) return q.resolve();
      const file = e.target.files[0];
      this.workingDir.getFile(
        filename,
        { create: true, exclusive: true },
        async fileEntry => {
          const fileWriter = await new Promise((r, j) => fileEntry.createWriter(r, j));

          const reader = new FileReader();

          reader.onloadend = e => {
            fileWriter.write(new Blob([e.target.result], { type: file.type }));
          }
          reader.onerror = q.reject;

          reader.readAsArrayBuffer(file);

          fileWriter.onwriteend = function (e) {
            q.resolve(`${fileEntry.fullPath} save successfully.`);
          }

          fileWriter.onerror = q.reject;
        },
        q.reject
      );
    }
    return q.promise;
  }

  async wget(filename, url) {
    if (await this.exist(filename)) {
      throw new Error('file already exist');
    }
    const q = defer();
    this.workingDir.getFile(filename, { create: true, exclusive: true }, async fileEntry => {
      const resp = await fetch(url);
      const meta = await resp.blob();
      q.resolve(await writeBlob(fileEntry, meta));
    }, q.reject);
    return q.promise;
  }

  async workerPost(dataMeta) {
    let d = dataMeta.trim();
    if (!d) return '';
    if (!this.workingWorker) return 'please start worker first';
    this.workingWorker.postMessage(JSON.parse(d));
    return '';
  }

  async node(pathname) {
    const q = defer();
    this.workingDir.getFile(pathname, {}, fileEntry => {
      const src = fileEntry.toURL();
      const doc = doms.fm.contentDocument;
      const s = doc.createElement('script');
      s.charset = 'utf-8';
      s.src = src;
      doc.body.appendChild(s);
      q.resolve('');
    }, q.reject);
    return q.promise;
  }

  async worker(pathname) {
    const q = defer();
    this.workingDir.getFile(pathname, {}, fileEntry => {
      const src = fileEntry.toURL();
      const win = doms.fm.contentWindow;
      if (this.workingWorker) {
        this.workingWorker.terminate();
        this.workingWorker = null;
      }
      this.workingWorker = new win.Worker(src);
      this.workingWorker.onmessage = function (evt) {
        console.log('worker: ', evt.data);
        if (this.workingWorker && evt.data.action === 'close') {
          this.terminate();
          this.workingWorker = null;
        }
      }
      this.workingWorker.postMessage({ action: 'start', startTime: Date.now() });
      q.resolve('worker started');
    }, q.reject);
    return q.promise;
  }

  /**
   * 获取当前工作路径
   * 
   * @returns 
   * @memberof Commands
   */
  async pwd() {
    return Promise.resolve(this.workingDir.fullPath);
  }


  /**
   * 删除文件或文件夹
   * 
   * @param {any} path 
   * @returns 
   * @memberof Commands
   */
  async rm(path) {
    let entry = null;
    try {
      entry = await promisify(this.workingDir, 'getFile')(path, {});
    } catch (e) { }

    if (!entry) {
      try {
        entry = await promisify(this.workingDir, 'getDirectory')(path, {});
      } catch (e) { }
    }

    if (!entry) throw Error('no such file or directory');
    return promisify(entry, 'remove')().then((d) => {
      return 'removed successfully';
    });
  }


  /**
   * 文件或文件夹是否存在
   * 
   * @param {any} path 
   * @returns 
   * @memberof Commands
   */
  async exist(path) {
    const paths = path.split('/').filter(d => !!d && d !== '.');
    const workingPaths = this.workingDir.fullPath.split('/').filter(d => !!d);
    let cur;
    while (cur = paths.shift()) {
      if (cur === '..') {
        workingPaths.pop();
      } else {
        workingPaths.push(cur);
      }
    }
    const q1 = defer();
    const q2 = defer();
    this.fs.root.getFile(workingPaths.join('/'), {}, q1.resolve, () => q1.resolve(null));
    this.fs.root.getDirectory(workingPaths.join('/'), {}, q2.resolve, () => q2.resolve(null));
    const rtn = await Promise.all([q1.promise, q2.promise]).then(res => res[0] || res[1]);
    return rtn ? true : false;
  }


  /**
   * 获取文件或文件夹的访问路径
   * 
   * @param {any} path 
   * @memberof Commands
   */
  async url(path) {
    const entry = await get(this.workingDir, path);
    return entry.toURL();
  }

  /**
   * 列出当前目录下的所有文件和文件夹
   * 
   * @returns 
   * @memberof Commands
   */
  async ls() {
    const q = defer();
    const dirReader = this.workingDir.createReader();
    let entries = [];

    const readEntries = function () {
      dirReader.readEntries(function (results) {
        if (!results.length) {
          q.resolve(entries.map(d => d.name).join('\t'));
        } else {
          entries = entries.concat(Array.from(results));
          readEntries();
        }
      }, q.reject);
    };

    readEntries();
    return q.promise;
  }

  /**
   * 创建文件夹
   * 
   * @param {any} path 
   * @returns 
   * @memberof Commands
   */
  async mkdir(path) {
    const directories = path.split('/').filter(d => !!d && d !== '.');
    let curDir = this.workingDir;
    let curPath = '';
    let i = 0;
    try {
      while (curPath = directories[i++]) {
        curDir = await getDirectoryOrCreate(curDir, curPath);
      }
    } catch (e) {
      console.warn(e);
    }
    return 'success!';
  }

  /**
   * 复制
   * 
   * @param {any} source 
   * @param {any} target 
   * @returns 
   * @memberof Commands
   */
  async cp(source, target) {
    const file = await promisify(this.workingDir, 'getFile')(source, {});
    const tarPaths = target.split('/').filter(d => !!d && d !== '.');
    const targetDir = await promisify(this.workingDir, 'getDirectory')(tarPaths.slice(0, -1), {});
    return (await promisify(file, 'copyTo')(targetDir, tarPaths.slice(-1).join(''))).fullPath;
  }

  /**
   * 导航
   * 
   * @param {any} path 
   * @returns 
   * @memberof Commands
   */
  async cd(path) {
    const q = defer();
    this.workingDir.getDirectory(path, {}, dir => {
      q.resolve(dir.fullPath);
      this.workingDir = dir;
    }, q.reject);
    return q.promise;
  }

  /**
   * 工作路径下的所有文件和文件夹
   * 
   * @param {any} arg [-f] for file only; [-d] for directory only;
   * @returns 
   * @memberof Commands
   */
  async all(arg) {
    const q = defer();
    let targetDirEntries = [this.fs.root];
    let curDir;
    const fileEntries = [];
    const dirEntries = [];
    while (curDir = targetDirEntries.shift()) {
      const entries = await getAllEntry(curDir);
      const dirs = entries.filter(d => d.isDirectory);
      const files = entries.filter(d => d.isFile);
      targetDirEntries = [...targetDirEntries, ...dirs];
      dirEntries.push(...dirs);
      fileEntries.push(...files);
    }
    if (arg === '-f') {
      return fileEntries.map(d => d.fullPath).join('\n');
    } else if (arg === '-d') {
      return dirEntries.map(d => d.fullPath).join('\n');
    }
    return `files:\n${fileEntries.map(d => d.fullPath).join('\t')}\nfolders:\n${dirEntries.map(d => d.fullPath).join('\t')}`
  }

  async cat(filename) {
    if (!filename) return 'please enter filename';
    let q = defer();
    this.workingDir.getFile(filename, {}, q.resolve, q.reject);
    const file = await q.promise;

    if (!file) {
      throw new Error(`File <${filename}> is not found`);
    }

    const txt = await readFile(file);
    return txt;
  }

  /**
   * 
   * 
   * @memberof Commands
   */
  async open(path) {
    const entry = await get(this.workingDir, path);
    if (!entry) {
      throw new Error('404 Not found');
    }
    window.open(entry.toURL());
    return '';
  }

  /**
   * 山寨冒牌编辑器
   * 
   * @param {any} filename 
   * @returns 
   * @memberof Commands
   */
  async vi(filename) {
    let value = '';
    let file = null;
    let isNew = false;

    if (!VI_ON) {
      const q = defer();

      // 获取文件
      try {
        file = await get(this.workingDir, filename);
      } catch (e) { }

      if (!file || !file.isFile) {
        // 创建文件
        this.workingDir.getFile(filename, { create: true, exclusive: true }, q.resolve, q.reject);
        isNew = true;
        file = await q.promise;
      } else {
        // 读取文件信息
        isNew = false;
        value = await readFile(file);
      }

      doms.edit.style.display = 'block';
      doms.edit.value = value;
      setTimeout(() => {
        doms.edit.focus();
        VI_ON = true;
      }, 16);
      this.workingFile = file;
      return 'tip: enter vi to save';
    } else if (this.workingFile) {
      file = this.workingFile;
      this.workingFile = null;
      VI_ON = false;
      const txt = (doms.edit.value || '').trim();
      doms.edit.style = 'none';
      doms.edit.value = '';
      if (!txt) {
        if (isNew) {
          const q = defer()
          file.remove(q.resolve, q.reject);
          return q.promise;
        } else {
          throw new Error('no content');
        }
      }
      return await write(file, txt);
    }
  }

  async move(source, path) {
    const srcEntry = await get(this.workingDir, source);
    const dirEntry = await get(this.workingDir, path);
    const q = defer();
    if (dirEntry.isDirectory || !srcEntry) {
      srcEntry.moveTo(dirEntry, undefined, () => q.resolve('move success.'), q.reject);
    } else {
      q.reject(new Error('Target directory not found'));
    }
    return q.promise;
  }

  /**
   * 重命名
   * 
   * @param {any} path 
   * @param {any} newName 
   * @returns 
   * @memberof Commands
   */
  async rename(path, newName) {
    if (!newName.trim()) {
      return Promise.reject('Please enter new name');
    }
    const q = defer();
    const fileEntry = await get(this.workingDir, path);
    if (!fileEntry.isFile) {
      q.reject(`${path} is not found`);
    } else {
      fileEntry.getParent(function(dirEntry) {
        fileEntry.moveTo(dirEntry, newName.trim(),
        (newFile) => {
          q.resolve(newFile.fullPath);
        }, q.reject);
      });
    }
    return q.promise;
  }

  async stat(pathname) {
    const entry = await get(this.workingDir, pathname);
    const q = defer();
    entry.getMetadata(info => {
      q.resolve(JSON.stringify({
        size: info.size,
        modificationTime: `${info.modificationTime.getFullYear()}-${info.modificationTime.getMonth() + 1}-${info.modificationTime.getDate()} ${info.modificationTime.getHours()}:${info.modificationTime.getMinutes()}:${info.modificationTime.getSeconds()}`
      }), d => d, 2);
    }, q.reject);
    return q.promise;
  }
}
