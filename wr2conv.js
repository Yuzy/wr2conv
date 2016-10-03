'use strict';

var version = '0.2.4';

if(!path){
	var path = require('path');
}

var patterns = {
	html: /<(DOCTYPE|html).+?>/i,
	javascript: /(var|function|=)/i,
	css: /(@charset|html,|body,)/i
};

var conv_options = {};
var all_images = [];
var filepath;
var basepath;

function convertHTML(src) {
	var reg = /<(\w+) (.*?)(\/?)>/;
	var capture;
	var result = '';

	while(src) {
		var resource = '';
		if(capture = reg.exec(src)) {
			result += src.substr(0,capture.index);

			var target = capture[0];
			var tag = resolveTag(target);

			if(tag.tagName == 'img'){
				if('src' in tag.attributes) {
					var file_flag = true;
					var filepath = tag.attributes.src;
					
					if(filepath.substr(0,4) == 'http' || filepath.substr(0,2) == '//'){
						file_flag = false;
					}

					if(file_flag){
						resource = getResourceName(filepath);
						setResource(filepath);
					}

					var keyValue = [];
					for(var key in tag.attributes) {
						if(key == 'src'){
							if(file_flag){
								keyValue.push('src="%' + resource + '%"');
							}else{
								keyValue.push('src="' + filepath + '"');
							}
						}else if(key == 'width' || key == 'height') {
							keyValue.push(key + '="%' + key + '(' + resource + ')%"');
						}else{
							if(tag.attributes[key] !== null){
								keyValue.push(key + '="' + tag.attributes[key] + '"');
							}else{
								keyValue.push(key);
							}
						}
					}
					result += '<' + tag.tagName + ' ' + keyValue.join(' ') + tag.xhtml + '>';
				}else{
					result += target;
				}
				src = src.substring(capture.index + capture[0].length);

				continue;
			}
			if(tag.tagName == 'style'){
				result += capture[0];
				src = src.substring(capture.index + capture[0].length);

				var css_end = /<\/style>/.exec(src);
				var css = convertCSS(src.substring(0,css_end.index));

				result += css + css_end[0];
				src = src.substring(css_end.index + css_end[0].length);

				continue;
			}
			if(tag.tagName == 'script'){
				if('src' in tag.attributes) {
					var filepath = tag.attributes.src;
					if(filepath.substr(0,4) == 'http' || filepath.substr(0,2) == '//'){
						result += capture[0];
					}else{
						resource = getResourceName(tag.attributes.src) + '%';
						if(conv_options.wr2ver){
							switch(conv_options.wr2ver){
								case '2.6':
								case 'old':
									resource = '%js.' + resource;
									break;
								case '2.7':
								case 'new':
								default:
									resource = '%' + resource;
									break;
							}
						}else{
							resource = '%' + resource;
						}
						result += capture[0].replace(tag.attributes.src, resource);
					}
					src = src.substring(capture.index + capture[0].length);
				}else{
					result += capture[0];
					src = src.substring(capture.index + capture[0].length);

					var js_end = /<\/script>/.exec(src);
					var js = convertJS(src.substring(0,js_end.index));

					result += js + js_end[0];
					src = src.substring(js_end.index + js_end[0].length);
				}
				continue;
			}
			if('href' in tag.attributes || 'src' in tag.attributes){
				var filepath;
				
				if('href' in tag.attributes) {
					filepath = tag.attributes.href;
				} else if('src' in tag.attributes) {
					filepath = tag.attributes.src;
				}
				
				if('href' in tag.attributes) { 
					if(filepath.substr(0,4) == 'http' || filepath.substr(0,2) == '//'){
						resource = '';
					}else if(tag.tagName != 'a'){
						resource = getResourceName(tag.attributes.href) + '%';
						if(path.extname(tag.attributes.href) == ".css") {
							if(conv_options.wr2ver){
								switch(conv_options.wr2ver){
									case '2.6':
									case 'old':
										resource = '%css.' + resource;
										break;
									case '2.7':
									case 'new':
									default:
										resource = '%' + resource;
										break;
								}
							}else{
								resource = '%' + resource;
							}
						}else{
							resource = '%' + resource;
						}
					}
				} else if('src' in tag.attributes) {
					if(filepath.substr(0,4) == 'http' || filepath.substr(0,2) == '//'){
						resource = '';
					}else if(path.extname(tag.attributes.src) == ".js"){
						resource = getResourceName(tag.attributes.src) + '%';
						if(conv_options.wr2ver){
							switch(conv_options.wr2ver){
								case '2.6':
								case 'old':
									resource = '%js.' + resource;
									break;
								case '2.7':
								case 'new':
								default:
									resource = '%' + resource;
									break;
							}
						}else{
							resource = '%' + resource;
						}
					}
				}
				if(resource){
					result += capture[0].replace(tag.attributes.href, resource);
				}else{
					result += capture[0];
				}
				src = src.substring(capture.index + capture[0].length);
				continue;
			}

			result += capture[0];
			src = src.substring(capture.index + capture[0].length);
			continue;
		}
		if(src) {
			result += src;
			src = '';
		}
	}

	return result;
}

function convertCSS(src) {
	var reg = /url\(('|")?([^'"\)]+)('|")?\)?/;
	var capture;
	var result = '';
	var filepath = '';

	while(src){
		if(capture = reg.exec(src)){
			result += src.substr(0,capture.index);
			var target = capture[0];
			var filepath = capture[2];

			if(filepath.substr(0,4) == 'http' || filepath.substr(0,2) == '//'){
				result += target;
			}else{
				var resource = getResourceName(filepath);
				setResource(filepath);
				result += target.replace(filepath,'%'+resource+'%');
			}
			src = src.substring(capture.index + capture[0].length);
			continue;
		}
		if(src){
			result += src;
			src = '';
		}
	}

	return result;
}

function convertJS(src) {
	return src;
}

function convertText(src) {
	return src;
}

function setResource(src){
	var src_path;
	if(conv_options.basedir) {
		src_path = path.resolve(basepath, src).replace(conv_options.basedir,'');
	}else{
		src_path = path.resolve(basepath, src).replace(path.resolve('./'),'');
	}
	if(all_images.indexOf(src_path) === -1){
		all_images.push(src_path);
	}
}

function getResourceName(filepath){
	var file,replace;
	if(conv_options.wr2ver){
		switch(conv_options.wr2ver){
			case '2.6':
			case 'old':
				file = path.basename(filepath,path.extname(filepath));
				replace = file.replace(/-/g,'_').replace(/\./,'_');
				break;
			case '2.7':
			case 'new':
			default:
				file = path.basename(filepath);
				replace = file.replace(/[-\.]/g,'_');
				break;
		}
	}else{
		file = path.basename(filepath);
		replace = file.replace(/[-\.]/g,'_');
	}
	return replace;
}

function resolveTag(tag){
	var reg = /^<(\w+) (.*?)(\/?)>$/;
	var capture;
	var result = {
		tagName: '',
		attributes: {},
		xhtml: ''
	};

	if(capture = reg.exec(tag)){
		result.tagName = capture[1];
		var attr = capture[2].trim().split(' ');
		if(capture[3]) {
			result.xhtml = '/';
		}
		if(attr.length){
			var key = '';
			var value;
			var prev_key = '';
			var close = true;
			for(var i in attr){
				var string = attr[i];
				var keyValue = string.split('=');
				if(keyValue.length > 1){
					close = false;
					key = keyValue.shift();
					value = keyValue.join('=').replace(/^('|")(.*)/,'$2').replace(/^(.*)('|")$/,'$1');
					result.attributes[key] = value;
					prev_key = key;
					if(string.substr(-1,1) == '"'){
						close = true;
					}
				}else{
					if(string == '"') {
						result.attributes[prev_key] += " ";
						close = true;
					}else if(string.substr(-1,1) == '"'){
						result.attributes[prev_key] += " " + string.replace(/^('|")?(.*[^\\])('|")/, '$2');
						close = true;
					}else{
						if(close){
							result.attributes[keyValue.shift()] = null;
						}else{
							result.attributes[prev_key] += " " + string.replace(/^('|")?(.*[^\\])('|")/, '$2');
						}
					}
				}
			}
		}
		return result;
	}
	return false;
}

function merge(obj) {
	var i = 1
		, target
		, key;

	for (; i < arguments.length; i++) {
		target = arguments[i];
		for (key in target) {
			if (Object.prototype.hasOwnProperty.call(target, key)) {
				obj[key] = target[key];
			}
		}
	}

	return obj;
}

var wr2conv = function(src,file){
	all_images = [];

	var type;

	if(file) {
		filepath = file;
		basepath = path.dirname(file);

		var result;
		if((result = file.match(/\.(html|htm|css|js)$/)) !== null) {
			type = result[1];
		}
	}

	if(!type){
		var buf = src.replace(/^ +/,'').substring(0,100);
		if(patterns.html.test(buf)){
			type = 'HTML';
		}else if(patterns.javascript.test(buf)){
			type = 'JS';
		}else if(patterns.css.test(buf)){
			type = 'CSS';
		}else{
			type = 'TEXT';
		}
	}

	src = src.replace(/\r\n|\r/g,'\n').replace(/\u00a0/g, ' ').replace(/\u2424/g, '\n');
	src = src.replace(/%/g,"%%");
	src = src.replace(/UTF8|UTF-8|Shift_jis|SJIS|EUC-JP|EUC_JP/gi,'%encoding()%');

	switch (type.toUpperCase()) {
		case 'JS':
			src = convertJS(src);
			break;
		case 'CSS':
			src = convertCSS(src);
			break;
		case 'HTML':
		case 'HTM':
			src = convertHTML(src);
			break;
		default:
			src = convertText(src);
	}

	return src;
}

var rep_images_count = [];
var rep_src_images = [];

wr2conv.clearResourceInfo = function(){
	rep_images_count = [];
	rep_src_images = [];
};

wr2conv.pushResource = function(){
	all_images.forEach(function(image,index,images_array) {
		if(rep_images_count[image]){
			rep_images_count[image]++;
		}else{
			rep_images_count[image] = 1;
		}
	});
	rep_src_images[filepath] = all_images;
};

wr2conv.getResourceInfo = function(){
	var resources = {
		site: [],
		file: {}
	};

	for(var i in rep_images_count) {
		if(rep_images_count[i] > 1){
			resources.site.push(i);
		}
	}

	for(var i in rep_src_images){
		var file = i;
		var images = rep_src_images[i];
		var file_images = images.filter(function(value,index,array){
			return (resources.site.indexOf(value) === -1) ? true : false;
		});
		resources.file[file] = file_images;
	}
	return resources;
};

wr2conv.getResourceReport = function(){
	var info = this.getResourceInfo();

	var date = new Date();
	var date_string = date.getFullYear() + "/" + (date.getMonth()+1) + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
	var report = "============================================================================\n" +
		" File resource check report\n" +
		" Generated : " + date_string + "\n" +
		"============================================================================\n\n\n";


	report += "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n";
	report += " Site resource\n";
	report += "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n\n";
	if(info.site.length){
		info.site.sort();
		info.site.forEach(function(value,index,array){
			report += "  " + value + "\n";
		});
	}else{
		report += "  No image\n\n";
	}
	report += "----------------------------------------------------------------\n";
	report += "  Total : " + info.site.length + " file(s)\n\n\n\n"

	report += "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n";
	report += " Template resource\n";
	report += "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n\n";
	for(var i in info.file){
		var src = i;
		var files = info.file[i];
		report += "----------------------------------------------------------------\n";
		report += " " + src + "\n";
		report += "----------------------------------------------------------------\n";
		if(files.length) {
			files.sort();
			files.forEach(function(value,index,array){
				report += "  " + value + "\n";
			});
			report += "----------------------------------------------------------------\n";
			report += "  Total : " + files.length + " file(s)\n\n\n";
		}else {
			report += "  No image\n\n";
		}
	}

	report += "Report end.";

	return report;
};

wr2conv.setOptions = function(options) {
	conv_options = merge(wr2conv.defaults, conv_options, options);
	return wr2conv;
};

wr2conv.defaults = {
	linkpath: '',
	basedir: ''
};

wr2conv.version = version;

module.exports = wr2conv;
