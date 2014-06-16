'use strict';

var version = '0.1.0';

var path = require('path');

var patterns = {
	html: /<(DOCTYPE|html).+?>/i,
	javascript: /(var|function|=)/i,
	css: /(@charset|html,|body,)/i
}

function convertCSS(src) {
	var reg = /url\(('|")?([^'"]+)('|")?\)/;
	var capture;
	var result = '';

	while(src){
		if(capture = reg.exec(src)){
			result += src.substr(0,capture.index);
			var target = capture[0];
			var resource = getResourceName(capture[2]);
			result += target.replace(capture[2],'%'+resource+'%');
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
			for(var i in attr) {
				var keyValue = attr[i].split('=');
				var key = keyValue.shift();
				var value = keyValue.join('=').replace(/^('|")(.*)('|")/,'$2');
				result.attributes[key] = value;
			}
		}
		return result;
	}
	return false;
}

function convertHTML(src) {
//	var reg = /<img(.+?)>/;
	var reg = /<(\w+) (.*?)(\/?)>/;
	var capture;
	var result = '';

	while(src) {
		if(capture = reg.exec(src)) {
			result += src.substr(0,capture.index);

			var target = capture[0];
			var tag = resolveTag(target);

			if(tag.tagName == 'img'){
				var resource;
				if('src' in tag.attributes) {
					var filepath = tag.attributes.src;
					var resource = getResourceName(filepath);
				}
				var keyValue = [];
				for(var key in tag.attributes) {
					if(key == 'src'){
						keyValue.push('src="%' + resource + '%"');
					}else if(key == 'width' || key == 'height') {
						keyValue.push(key + '="%' + key + '(' + resource + ')%"');
					}else{
						if(tag.attributes[key]){
							keyValue.push(key + '="' + tag.attributes[key] + '"');
						}else{
							keyValue.push(key);
						}
					}
				}
				result += '<' + tag.tagName + ' ' + keyValue.join(' ') + tag.xhtml + '>';
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
				result += capture[0];
				src = src.substring(capture.index + capture[0].length);

				var js_end = /<\/script>/.exec(src);
				var js = convertJS(src.substring(0,js_end.index));

				result += js + js_end[0];
				src = src.substring(js_end.index + js_end[0].length);

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

function convertJS(src) {
	return src;
}

function convertText(src) {
	return src;
}

function getResourceName(filepath){
	var file = path.basename(filepath,path.extname(filepath));
	return file.replace('-','_').replace('.','_');
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

var wr2conv = function(src,type){
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

wr2conv.setOptions = function(options) {
	merge(wr2conv.defaults, options);
	return wr2conv;
};

wr2conv.defaults = {
	linkpath: ''
};

wr2conv.version = version;

module.exports = wr2conv;
