function getHeaderFromHeaders(headers, headerName) {
    for (var i = 0; i < headers.length; ++i) {
        var header = headers[i];
        if (header.name.toLowerCase() === headerName) {
            return header;
        }
    }
}

function loadScript(url, onLoadCallback)
{
    // Adding the script tag to the head as suggested before
    var head = document.head;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    //script.onreadystatechange = callback;
    script.onload = onLoadCallback;

    // Fire the loading
    head.appendChild(script);
}

function getRedirectURL(url) {
	return chrome.runtime.getURL('viewer.html') + "?url=" + url;
}

chrome.webRequest.onHeadersReceived.addListener(function(details){
	var mime_type = getHeaderFromHeaders(details.responseHeaders, 'content-type');
	if (mime_type.value == 'application/postscript') {
		// places like arXiv don't have .ps filenames in their URLs,
		// so we need to check MIME type for requests as well.
		return {
			redirectUrl: getRedirectURL(details.url)
		}
	}
},
	{urls: ["<all_urls>"],types: ["main_frame"]},
	["blocking", "responseHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(function(info) {
	var urlObject = new URL(info.url);
	if (
	(urlObject.pathname.endsWith('.ps') || urlObject.pathname.endsWith('.ps.gz'))
	&&
	(info.initiator == null || info.initiator.indexOf(chrome.runtime.id) == -1) // not ourselves
	) {
	      return {
		redirectUrl: getRedirectURL(info.url)
      };
    }
  },
  	{urls: ["<all_urls>"], types: ["main_frame"]},
  	["blocking"]
);

var Module;

function _GSPS2PDF(dataStruct, responseCallback, progressCallback, statusUpdateCallback) {
	//set up EMScripten environment
	Module = {
        preRun: [function(){
		var data = FS.writeFile('input.ps', new Uint8Array(dataStruct.psData));
	}],
        postRun: [function() {
		var uarray = FS.readFile('output.pdf', {encoding: 'binary'}); //Uint8Array
		responseCallback({pdfData: Array.from(uarray), url: dataStruct.url});
	}],
	arguments: ['-sDEVICE=pdfwrite', '-DBATCH', '-DNOPAUSE',
	 '-q',
	 '-sOutputFile=output.pdf', '-c', '.setpdfwrite <</AlwaysEmbed [/Helvetica /Times-Roman]>> setdistillerparams', '-f', 'input.ps'],
        print: function(text) {
           statusUpdateCallback(text);
          },
        printErr: function(text) {
	   statusUpdateCallback('Error: ' + text);
	   console.error(text);
        },
        setStatus: function(text) {
          if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
          if (text === Module.setStatus.last.text) return;
          var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
          var now = Date.now();
          if (m && now - Module.setStatus.last.time < 30) // if this is a progress update, skip it if too soon
		return;
          Module.setStatus.last.time = now;
          Module.setStatus.last.text = text;
          if (m) {
            text = m[1];
            progressCallback(false, parseInt(m[2])*100, parseInt(m[4])*100);
          } else {
            progressCallback(true, 0, 0);
          }
          statusUpdateCallback(text);
        },
        totalDependencies: 0
      };
	Module.setStatus('Loading Postscript Converter...');
	loadScript('gs.js', null);
}

chrome.runtime.onConnect.addListener(function(port) {
	if (port.name == 'ps2pdfport') {
	port.onMessage.addListener(function(msg) {
		if (msg.requestType == 'ps2pdf') {
			psData = msg.requestData;
			_GSPS2PDF(psData, function(replyData) {
				port.postMessage({msgType: 'result', data: replyData});
			}, 
			function(is_done, value, max_val) {
				port.postMessage({
				msgType: 'convprog', isDone: is_done, value: value, maxVal: max_val});
			}, function(status) {
				port.postMessage({
				msgType: 'status', status: status});
			});
			return true;
		}
	});}
});
