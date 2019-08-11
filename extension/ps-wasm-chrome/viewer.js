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
          var blob = new Blob([psData], {type: "application/octet-stream"});
          var psDataURL = window.URL.createObjectURL(blob);
          readyCallback({psDataURL: psDataURL, url: data_url});
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
  var filename = new URL(response.url).pathname.split('/').pop();
  var displayURL = "chrome-extension://" + chrome.runtime.id + '/' + response.url; // this is the best we can do
  document.getElementById('wrapper').remove();
  var frame = document.getElementById('the_frame');
  frame.width = '100%';
  frame.style.height = '100vh';
  frame.style.border = '0px';
  frame.src = pdfURL;
  window.history.replaceState(null, "PDF Title", displayURL);
  document.title = filename;
}

window.onload = function() {
  var frame = document.getElementById('the_frame');
  frame.width = '0';
  frame.height = '0';
  frame.style.margin = '0';

  var loaderNode = document.getElementById("downloader");
  var search = window.location.search.substring(1);
  var incoming = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
  var inputURL = incoming.url;
  if (inputURL.startsWith('chrome-extension')) // hack to support reloading
  {
    var program_id = chrome.runtime.id;
    inputURL = inputURL.substring(inputURL.indexOf(program_id) + program_id.length + 1);
  }
  loaderNode.innerHTML = 'Downloading from ' + inputURL + '...';
  var progressNode = document.getElementById('dl_progress');
  pullData(inputURL,
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
			var status = document.getElementById('conv_status');
      if (status) {
        status.innerHTML += msg.status + '<br>';
      }
		}
	});
	port.postMessage({requestType: 'ps2pdf', requestData: requestData});
  });
};
