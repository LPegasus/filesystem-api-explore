let cnt = 3;
onmessage = function(event) {
  if (cnt === 0) {
    postMessage({ action: 'close' });
    close();
    return;
  }

  if (event.data.action === 'start') {
    console.log('worker create time cost: ', Date.now() - event.data.startTime);
    cnt = 3;
    return;
  }
  const data = event.data;
  postMessage(event.data);
  cnt--;
}

