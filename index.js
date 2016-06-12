/* Serve - an amazingly simple static HTTP server
 * -============================================-
 * Serve is designed to be used to host static files. It provides a nice interface for browsing files.
 * Written by Henry (@offbeatwitch)
 */

var http = require("http"),
	fs = require("fs"),
	util = require("util"),
	mu = require("mu2"),
	mime = require("mime"),
	url = require("url");

var config = JSON.parse(fs.readFileSync(__dirname + "/config/config.json", "utf8"));

var server = http.createServer();
mu.root = __dirname + "/template";
var FILE_BASE = __dirname + "/public";

function imageLookup(file, isDir) {
	if (isDir)
		return "/template/img/folder.png";

	var type = mime.extension(mime.lookup(file)),
		filename = __dirname + "/template/img/" + type + ".png";

	if (fs.existsSync(filename)) {
		return "/template/img/" + type + ".png";
	} else {
		return "/template/img/blank.png";
	}
}

function stripTrailingSlash(str) {
	if (str.substr(-1) === '/') return str.substr(0, str.length - 1);
	return str;
}

server.on("request", function(req, res) {
	var requested = url.parse(req.url, true);
	var filepath = FILE_BASE + requested.pathname;

	if (requested.pathname.startsWith("/template/img/")) {
		if (fs.existsSync(__dirname + requested.pathname)) {
			res.writeHead(200, {"Content-Type": "image/png"});
			fs.createReadStream(__dirname + requested.pathname).pipe(res);

			return;
		}
	}

	fs.stat(filepath, function(err, stats) {
		if (err) {
			res.writeHead(404);
			res.end("404 not found.");
			return;
		}

		if (stats.isDirectory()) {
			fs.readdir(filepath, function(err, files) {
				var fileList = files.map(function(file, i) {
					return {
						name: file,
						href: stripTrailingSlash(requested.pathname) + "/" + file,
						img: imageLookup(file, fs.statSync(filepath + "/" + file).isDirectory())
					};
				});

				if (!filepath.endsWith("/public/"))
					fileList.unshift({ name: "..", href: "..", img: null });

				res.writeHead(200, {"Content-Type": "text/html"});

				if (!config.caching) mu.clearCache();
				var stream = mu.compileAndRender("index.html", {
					title: config.title + " | " + requested.pathname,
					header: config.header,
					footer: config.footer,
					files: fileList
				});

				stream.pipe(res);
			});
		} else if (stats.isFile()) {
			res.writeHead(200, { "Content-Type": mime.lookup(filepath), "Content-Length": stats.size });

			fs.createReadStream(filepath).pipe(res);
		}
	});
});

server.listen(80);
console.log("Listening on ::80");