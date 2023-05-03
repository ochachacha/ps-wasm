function pullData(data_url, progressCallback, readyCallback) {
    // ignoring progressCallback for now
    fetch(data_url).then((response) => response.arrayBuffer()).then((buffer) => {
        var psData = new Uint8Array(buffer);
        var headerView = new DataView(buffer, 0, 2);
        var header = headerView.getUint16(0);
        if (header == 0x8B1F) {
            // some servers don't have gzip support turned on, which means we have to manually inflate
            psData = pako.ungzip(psData);
        }
        var blob = new Blob([psData], { type: "application/octet-stream" });
        var psDataURL = window.URL.createObjectURL(blob);
        readyCallback({ psDataURL: psDataURL, url: data_url });
    });
}

function loadPDFData(response) {
    fetch(response.pdfDataURL).then((response) => response.arrayBuffer()).then((buffer) => {
        window.URL.revokeObjectURL(response.pdfDataURL);
        var blob = new Blob([buffer], { type: "application/pdf" });
        var pdfURL = window.URL.createObjectURL(blob);
        var filename = new URL(response.url).pathname.split('/').pop();
        ///var displayURL = "chrome-extension://" + chrome.runtime.id + '/' + response.url; // this is the best we can do
        document.getElementById('wrapper').remove();
        var frame = document.getElementById('the_frame');
        frame.width = '100%';
        frame.style.height = '100vh';
        frame.style.border = '0px';
        frame.src = pdfURL;
        //window.history.replaceState(null, filename, displayURL);
        document.title = filename;
    });
}

window.onload = function () {
    var frame = document.getElementById('the_frame');
    frame.width = '0';
    frame.height = '0';
    frame.style.margin = '0';

    var loaderNode = document.getElementById("downloader");
    var search = window.location.search.substring(1);
    var incoming = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
    var inputURL = incoming.url;
    if (inputURL.startsWith('chrome-extension')) // hack to support reloading
    {
        var program_id = chrome.runtime.id;
        inputURL = inputURL.substring(inputURL.indexOf(program_id) + program_id.length + 1);
    }
    loaderNode.innerHTML = 'Downloading from ' + inputURL + '...';
    var progressNode = document.getElementById('dl_progress');
    pullData(inputURL,
        function (evt) { // display progress (if possible)
            if (evt.lengthComputable) {
                progressNode.innerHTML = 'Progress: ' + evt.loaded + ' / ' + evt.total;
            }
        },
        function (requestData) {
            _GSPS2PDF(requestData,
                function (replyData) { loadPDFData(replyData); },
                function (is_done, value, max_val) { },
                function (status) {
                    var statusElement = document.getElementById('conv_status');
                    if (status) {
                        statusElement.innerHTML += status + '<br>';
                    }
                }
            )
        });
};

function loadScript(url, onLoadCallback) {
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

var Module;

function _GSPS2PDF(dataStruct, responseCallback, progressCallback, statusUpdateCallback) {
    // first download the ps data
    fetch(dataStruct.psDataURL).then((response) => response.arrayBuffer()).then((buffer) => {
        // release the URL
        window.URL.revokeObjectURL(dataStruct.psDataURL);
        //set up EMScripten environment
        Module = {
            preRun: [function () {
                var data = FS.writeFile('input.ps', new Uint8Array(buffer));
            }],
            postRun: [function () {
                var uarray = FS.readFile('output.pdf', { encoding: 'binary' }); //Uint8Array
                var blob = new Blob([uarray], { type: "application/octet-stream" });
                var pdfDataURL = window.URL.createObjectURL(blob);
                responseCallback({ pdfDataURL: pdfDataURL, url: dataStruct.url });
            }],
            arguments: ['-sDEVICE=pdfwrite', '-DBATCH', '-DNOPAUSE',
                '-q',
                '-sOutputFile=output.pdf', '-c', '.setpdfwrite <</AlwaysEmbed [/Helvetica /Times-Roman]>> setdistillerparams', '-f', 'input.ps'],
            print: function (text) {
                statusUpdateCallback(text);
            },
            printErr: function (text) {
                statusUpdateCallback('Error: ' + text);
                console.error(text);
            },
            setStatus: function (text) {
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
                    progressCallback(false, parseInt(m[2]) * 100, parseInt(m[4]) * 100);
                } else {
                    progressCallback(true, 0, 0);
                }
                statusUpdateCallback(text);
            },
            totalDependencies: 0
        };
        Module.setStatus('Loading Postscript Converter...');
        loadScript('gs.js', null);
    });
}