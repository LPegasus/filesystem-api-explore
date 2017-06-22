let fs;
onmessage = function (event) {
  if (event.data.action === 'start') {
    console.log('worker create time cost: ', Date.now() - event.data.startTime);
    fs = webkitRequestFileSystemSync(0, 1024 * 1024 * 100);
    return;
  }
  if (event.data.action) {
    const res = typeof fs.root[event.data.action] === 'function'
      ? fs.root[event.data.action].apply(fs.root, event.data.args)
      : fs.root[event.data.action];
    postMessage(res);
  }
}
