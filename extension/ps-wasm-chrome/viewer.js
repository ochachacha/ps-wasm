function pullData(data_url, progressCallback, readyCallback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', data_url, true);
  xhr.responseType = "arraybuffer";
  xhr.onprogress = progressCallback;
  xhr.onreadystatechange = function() {
    try {
      if (xhr.readyState === XMLHttpRequest.DONE) {
	var psData = new Uint8Array(xhr.response);
	var headerView = new DataView(xhr.response, 0, 4);
	var header = headerView.getUint32(0);
	if (header != 0x25215053) // '%!PS', big endian
	{
		// some servers don't have gzip support turned on, which means we have to manually inflate
		psData = pako.ungzip(psData);
	}
        readyCallback({
		psData: Array.from(psData),
		url: data_url
		});
      }
    } catch (e) {
      console.error(e);
    }
  };
  xhr.send();
}

function loadPDFData(response) {
	var pdfData = new Uint8Array(response.pdfData);
	var blob = new Blob([pdfData], {type: "application/pdf"});
	var pdfURL = window.URL.createObjectURL(blob);
	window.location.replace(pdfURL);
	var filename = new URL(response.url).pathname; //wish there was a way to diplay this ...
}

window.onload = function() {
  var loaderNode = document.getElementById("downloader");
  var search = window.location.search.substring(1);
  var incoming = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
  loaderNode.innerHTML = 'Downloading from ' + incoming.url + '...';
  var progressNode = document.getElementById('dl_progress');
  pullData(incoming.url, 
  function(evt) { // display progress (if possible)
	  if (evt.lengthComputable) {
		  progressNode.innerHTML = 'Progress: ' + evt.loaded + ' / ' + evt.total;
	  }
  },
  function(requestData) { // ready
	var port = chrome.runtime.connect({name: 'ps2pdfport'});
	port.onMessage.addListener(function(msg) {
		if (msg.msgType == 'result') {
			loadPDFData(msg.data);
		}
		else if (msg.msgType == 'convprog') {
			//console.log(msg); // no need to implement for now
		}
		else if (msg.msgType == 'status') {
			document.getElementById('conv_status').innerHTML += msg.status + '<br>';
		}
	});
	port.postMessage({requestType: 'ps2pdf', requestData: requestData});
  });
};
