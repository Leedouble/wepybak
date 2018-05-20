import wepy from 'wepy'

export default class tipMixin extends wepy.mixin {
  data = {}
  methods = {}

  toast(type, msg, time = 1000) {
    if (type === 'success') {
      wepy.showToast({
        title: msg,
        duration: time
      })
    } else {
      wepy.showToast({
        title: msg,
        image: '../assets/image/icon_warning.png',
        duration: time
      })
    }
  }

  onLoad() {
  }
}
