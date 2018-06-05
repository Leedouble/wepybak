/**
 * author: Di (微信小程序开发工程师)
 * organization: WeAppDev(微信小程序开发论坛)(http://weappdev.com)
 *               垂直微信小程序开发交流社区
 *
 * github地址: https://github.com/icindy/wxParse
 *
 * for: 微信小程序富文本解析
 * detail : http://weappdev.com/t/wxparse-alpha0-1-html-markdown/184
 */

/**
 * utils函数引入
 **/
import showdown from './showdown.js'
import HtmlToJson from './html2json.js'

/**
 * 配置及公有属性
 **/
let realWindowWidth = 0
let realWindowHeight = 0
wx.getSystemInfo({
  success (res) {
    realWindowWidth = res.windowWidth
    realWindowHeight = res.windowHeight
  }
})

/**
 * 主函数入口区
 * 1.bindName       绑定的数据名(必填)
 * 2.type           可以为html或者md(必填)
 * 3.data           为传入的具体数据(必填)
 * 4.target         为Page对象,一般为this(必填)
 * 5.imagePadding   为当图片自适应是左右的单一padding(默认为0,可选)
 * 6.clearStyle     清除行内样式(仅type为html有效, 默认为false, 可选)
 * 7.clearClass     清除class(仅type为html有效, 默认为false, 可选)
 **/
// bindName = 'wxParseData',type = 'html',data = '<div class="color:red;">数据不能为空</div>',target,imagePadding
function wxParse (options = {}) {
  const that = options.target // Page对象
  let transData = {}          // 存放转化后的数据
  let bindData = {}
  // 解析内容
  if (options.type === 'html') {
    transData = HtmlToJson.html2json(options.data, {
      bindName: options.bindName,
      clearStyle: options.clearStyle,
      clearClass: options.clearClass
    })
  } else if (options.type === 'md' || options.type === 'markdown') {
    const converter = new showdown.Converter()
    // var html = converter.makeHtml(data)
    transData = HtmlToJson.html2json(converter.makeHtml(options.data), {
      bindName: options.bindName,
      clearStyle: options.clearStyle,
      clearClass: options.clearClass
    })
  }

  transData.view = {}
  transData.view.imagePadding = options.imagePadding || 0
  bindData[options.bindName] = transData
  that.setData(bindData)
  that.bindData = bindData
  that.wxParseImgLoad = wxParseImgLoad
  that.wxParseImgTap = wxParseImgTap

  // 新增
  bindData.wxParseImgLoad = wxParseImgLoad
  bindData.wxParseImgTap = wxParseImgTap
  return bindData
}

// 图片点击事件
function wxParseImgTap (e, bindData) {
  const nowImgUrl = e.target.dataset.src
  const tagFrom = e.target.dataset.from

  if (typeof tagFrom !== 'undefined' && tagFrom.length > 0) {
    wx.previewImage({
      current: nowImgUrl, // 当前显示图片的http链接
      urls: bindData[tagFrom].imageUrls // 需要预览的图片http链接列表
    })
  }
}

/**
 * 图片视觉宽高计算函数区
 **/
function wxParseImgLoad (e) {
  const tagFrom = e.target.dataset.from
  if (typeof tagFrom !== 'undefined' && tagFrom.length > 0) {
    calMoreImageInfo(e, e.target.dataset.idx, this, tagFrom)
  }
}

// 假循环获取计算图片视觉最佳宽高
function calMoreImageInfo (e, idx, that, bindName) {
  const temData = that.data[bindName]
  if (!temData || temData.images.length === 0) return
  const temImages = temData.images
  // 因为无法获取view宽度 需要自定义padding进行计算，稍后处理
  const recal = wxAutoImageCal(e.detail.width, e.detail.height, that, bindName)
  // temImages[idx].width = recal.imageWidth;
  // temImages[idx].height = recal.imageheight;
  // temData.images = temImages;
  // var bindData = {};
  // bindData[bindName] = temData;
  // that.setData(bindData);
  let key = `${bindName}`
  for (let i of temImages[idx].index.split('.')) key += `.nodes[${i}]`
  that.setData({
    [key + '.width']: recal.imageWidth,
    [key + '.height']: recal.imageheight
  })
}

// 计算视觉优先的图片宽高
function wxAutoImageCal (originalWidth, originalHeight, that, bindName) {
  // 获取图片的原始长宽
  let windowWidth = 0
  let windowHeight = 0
  let autoWidth = 0
  let autoHeight = 0
  const results = {}
  const padding = that.data[bindName].view.imagePadding

  windowWidth = realWindowWidth - 2 * padding
  windowHeight = realWindowHeight
  // 判断按照那种方式进行缩放
  if (originalWidth > windowWidth) {
    // 在图片width大于手机屏幕width时候
    autoWidth = windowWidth
    autoHeight = autoWidth * originalHeight / originalWidth
    results.imageWidth = autoWidth
    results.imageheight = autoHeight
  } else {
    // 否则展示原来的数据
    results.imageWidth = originalWidth
    results.imageheight = originalHeight
  }
  return results
}

function wxParseTemArray (temArrayName, bindNameReg, total, that) {
  const temData = that.data
  let array = []
  let obj = null

  for (let i = 0; i < total; i++) {
    const simArr = temData[bindNameReg + i].nodes
    array.push(simArr)
  }

  temArrayName = temArrayName || 'wxParseTemArray'
  obj = JSON.parse('{"' + temArrayName + '":""}')
  obj[temArrayName] = array
  that.setData(obj)
}

/**
 * 配置emojis
 *
 */

function emojisInit (reg = '', baseSrc = '/wxParse/emojis/', emojis) {
  HtmlToJson.emojisInit(reg, baseSrc, emojis)
}

module.exports = {
  wxParse: wxParse,
  wxParseImgTap: wxParseImgTap,
  wxParseTemArray: wxParseTemArray,
  emojisInit: emojisInit
}
