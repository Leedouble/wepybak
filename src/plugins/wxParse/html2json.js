/**
 * html2Json 改造来自: https://github.com/Jxck/html2json
 *
 *
 * author: Di (微信小程序开发工程师)
 * organization: WeAppDev(微信小程序开发论坛)(http://weappdev.com)
 *               垂直微信小程序开发交流社区
 *
 * github地址: https://github.com/icindy/wxParse
 *
 * for: 微信小程序富文本解析
 * detail : http://weappdev.com/t/wxparse-alpha0-1-html-markdown/184
 */

var __placeImgeUrlHttps = 'https';
var __emojisReg = '';
var __emojisBaseSrc = '';
var __emojis = {};
var wxDiscode = require('./wxDiscode.js');
var HTMLParser = require('./htmlparser.js');
// Empty Elements - HTML 5
var empty = makeMap('area,base,basefont,br,col,frame,hr,img,input,link,meta,param,embed,command,keygen,source,track,wbr');
// Block Elements - HTML 5
var block = makeMap('br,a,code,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video');

// Inline Elements - HTML 5
var inline = makeMap('abbr,acronym,applet,b,basefont,bdo,big,button,cite,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var');

// Elements that you can, intentionally, leave open
// (and which close themselves)
var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr');

// Attributes that have their values filled in disabled="disabled"
var fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected');

// Special Elements (can contain anything)
var special = makeMap('wxxxcode-style,script,style,view,scroll-view,block');
function makeMap (str) {
  var obj = {},
    items = str.split(',')
  for (var i = 0; i < items.length; i++) obj[items[i]] = true
  return obj;
}

function q (v) {
  return '"' + v + '"';
}

function removeDOCTYPE (html) {
  return html
    .replace(/<\?xml.*\?>\n/, '')
    .replace(/<.*!doctype.*\>\n/, '')
    .replace(/<.*!DOCTYPE.*\>\n/, '');
}

function trimHtml (html) {
  return html
    .replace(/\r?\n+/g, '')
    .replace(/<!--.*?-->/gi, '')
    .replace(/\/\*.*?\*\//gi, '')
    .replace(/[ ]+</gi, '<')
}

/**
 *
 * @param {any} html            必选 html模板内容
 * @param {string} bindName     必选 绑定的数据名
 * @param {boolean} clearStyle  可选 清除行内样式 默认为false
 * @param {boolean} clearClass  可选 清除class 默认为false
 */
// html, bindName,
function html2json (html, options) {
  // 处理字符串
  html = removeDOCTYPE(html);
  html = trimHtml(html);
  html = wxDiscode.strDiscode(html);

  // 生成node节点
  let bufArray = [];
  let results = {
    node: options.bindName,
    nodes: [],
    images: [],
    imageUrls: []
  };
  let index = 0;

  HTMLParser(html, {
    start (tag, attrs, unary) {
      // debug(tag, attrs, unary);
      // node for this element
      // new ...
      let node = {
        index: '',
        node: 'element',
        tag: tag,
        tagType: 'block',
        attr: [],
        classStr: '',
        styleStr: []
      };

      if (bufArray.length === 0) {
        node.index = `${index}`
        index += 1
      } else {
        const parent = bufArray[0];
        if (parent.nodes === undefined) {
          parent.nodes = [];
        }
        node.index = `${parent.index}.${parent.nodes.length}`;
      }

      // 判断标签类型
      if (block[tag]) {
        node.tagType = 'block';
      } else if (inline[tag]) {
        node.tagType = 'inline';
      } else if (closeSelf[tag]) {
        node.tagType = 'closeSelf';
      }

      // new 解析node节点属性
      if (attrs.length !== 0) {
        node.attr = attrs.reduce((pre, attr) => {
          const name = attr.name
          let value = attr.value

          if (name === 'class' && !options.clearClass) {
            node.classStr = value
          }

          // has multi attibutes
          // make it array of attribute
          if (name === 'style' && !options.clearStyle) {
            const _value = value.split(';')
            node.styleStr = node.styleStr.concat(_value)
          }

          if (value.match(/ /)) {
            value = value.split(' ')
          }

          // if attr already exists
          // merge it
          if (pre[name]) {
            if (Array.isArray(pre[name])) {
              // already array, push to last
              pre[name].push(value);
            } else {
              // single value, make it array
              pre[name] = [pre[name], value];
            }
          } else {
            // not exist, put it
            pre[name] = value;
          }

          return pre;
        }, {});
      }

      // 对img标签添加额外数据
      if (node.tag === 'img') {
        let imgUrl = node.attr.src;
        node.imgIndex = results.images.length;
        imgUrl[0] === '' && imgUrl.splice(0, 1);
        imgUrl = wxDiscode.urlToHttpUrl(imgUrl, __placeImgeUrlHttps);
        node.attr.src = imgUrl;
        node.from = options.bindName;
        results.images.push(node);
        results.imageUrls.push(imgUrl);
      }

      // 处理font标签样式属性
      if (node.tag === 'font') {
        const fontSize = [
          'x-small',
          'small',
          'medium',
          'large',
          'x-large',
          'xx-large',
          '-webkit-xxx-large'
        ];
        const styleAttrs = {
          color: 'color',
          face: 'font-family',
          size: 'font-size'
        };

        if (!node.attr.style) node.attr.style = [];

        // new
        Object.keys(styleAttrs).forEach(key => {
          if (!node.attr[key]) return
          const value = key === 'size' ? fontSize[node.attr[key] - 1] : node.attr[key]
          node.attr.style.push(styleAttrs[key])
          node.attr.style.push(value)
          !options.clearStyle && node.styleStr.push(`${styleAttrs[key]}:${value}`)
        })
      }

      // new 拼接styleStr
      node.styleStr = node.styleStr.join(';')

      // 临时记录source资源
      if (node.tag === 'source') {
        results.source = node.attr.src;
      }

      if (unary) {
        // if this tag doesn't have end tag
        // like <img src="hoge.png"/>
        // add to parents
        let parent = bufArray[0] || results;
        if (parent.nodes === undefined) {
          parent.nodes = [];
        }
        parent.nodes.push(node);
      } else {
        bufArray.unshift(node);
      }
    },
    end (tag) {
      //debug(tag);
      // merge into parent tag
      let node = bufArray.shift();
      if (node.tag !== tag) console.error('invalid state: mismatch end tag');

      //当有缓存source资源时于于video补上src资源
      if (node.tag === 'video' && results.source) {
        node.attr.src = results.source;
        delete results.source;
      }

      if (bufArray.length === 0) {
        results.nodes.push(node);
      } else {
        let parent = bufArray[0];
        if (parent.nodes === undefined) {
          parent.nodes = [];
        }
        parent.nodes.push(node);
      }
    },
    chars (text) {
      // debug(text);
      let node = {
        index: '',
        node: 'text',
        text: text,
        textArray: transEmojiStr(text)
      };

      if (bufArray.length === 0) {
        node.index = `${index}`
        index += 1
        results.nodes.push(node);
      } else {
        let parent = bufArray[0];
        if (parent.nodes === undefined) {
          parent.nodes = [];
        }
        node.index = parent.index + '.' + parent.nodes.length;
        parent.nodes.push(node);
      }
    },
    comment (text) {
      //debug(text);
      // var node = {
      //     node: 'comment',
      //     text: text,
      // };
      // var parent = bufArray[0];
      // if (parent.nodes === undefined) {
      //     parent.nodes = [];
      // }
      // parent.nodes.push(node);
    }
  })
  return results
}

function transEmojiStr (str) {
  // var eReg = new RegExp("["+__reg+' '+"]");
  // str = str.replace(/\[([^\[\]]+)\]/g, ':$1:')

  var emojiObjs = []
  //如果正则表达式为空
  if (__emojisReg.length == 0 || !__emojis) {
    var emojiObj = {}
    emojiObj.node = 'text'
    emojiObj.text = str
    array = [emojiObj]
    return array
  }
  //这个地方需要调整
  str = str.replace(/\[([^\[\]]+)\]/g, ':$1:')
  var eReg = new RegExp('[:]')
  var array = str.split(eReg);
  for (var i = 0; i < array.length; i++) {
    var ele = array[i]
    var emojiObj = {}
    if (__emojis[ele]) {
      emojiObj.node = 'element'
      emojiObj.tag = 'emoji'
      emojiObj.text = __emojis[ele]
      emojiObj.baseSrc = __emojisBaseSrc
    } else {
      emojiObj.node = 'text'
      emojiObj.text = ele
    }
    emojiObjs.push(emojiObj)
  }

  return emojiObjs
}

function emojisInit (reg = '', baseSrc = '/wxParse/emojis/', emojis) {
  __emojisReg = reg
  __emojisBaseSrc = baseSrc
  __emojis = emojis
}

module.exports = {
  html2json: html2json,
  emojisInit: emojisInit
}
