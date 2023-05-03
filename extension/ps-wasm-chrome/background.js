function getHeaderFromHeaders(headers, headerName) {
    for (var i = 0; i < headers.length; ++i) {
        var header = headers[i];
        if (header.name.toLowerCase() === headerName) {
            return header;
        }
    }
}

function getRedirectURL() {
	return chrome.runtime.getURL('viewer.html') + "?url=";
}

chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1001],
    addRules: [{
        'id': 1001,
        'priority': 1,
        'action': {
            'type': 'redirect',
            'redirect': {
                'regexSubstitution': getRedirectURL() + '\\0'
            }
        },
        'condition': {
            'regexFilter': ".*\\.ps(\\.gz)?$",
            'resourceTypes': ['main_frame']
        }
    }]
});

/*chrome.webRequest.onHeadersReceived.addListener(function(details){
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
);*/