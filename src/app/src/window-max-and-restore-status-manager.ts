declare const vanella: any

class MaxAndRestoreStatusManager {
    private currentStatus: string
    private rememberedCoordinates: { left: number; top: number; width: number; height: number }
    private setMaxButton: HTMLElement
    private setRestoreButton: HTMLElement
    private isFullscreen: boolean = false
  
    constructor(setMaxButton: HTMLElement, setRestoreButton: HTMLElement) {
      this.currentStatus = 'default'
      this.rememberedCoordinates = { left: 0, top: 0, width: 0, height: 0 }
      this.setMaxButton = setMaxButton
      this.setRestoreButton = setRestoreButton
  
      this.setMaxButton.addEventListener('click', this.onSetMaxButtonClick.bind(this))
      this.setRestoreButton.addEventListener('click', this.onSetRestoreButtonClick.bind(this))
      const element = document.documentElement

      document.addEventListener('keydown', (event) => {
        if (event.key === 'F11') {
          event.preventDefault()

          if (this.isFullscreen) {
            document.exitFullscreen()
            this.restoreCoordinatesAndSwitchStatus()
            this.currentStatus = 'default'
          } else {
            this.rememberCoordinatesAndSwitchStatus()
            element.requestFullscreen()
            this.currentStatus = 'full'
          }
                
          this.isFullscreen = !this.isFullscreen
              
        }
      })
    }
  
    private onSetMaxButtonClick() {
      document.body.classList.add('maximized')
      this.rememberCoordinatesAndSwitchStatus()
    }
  
    private onSetRestoreButtonClick() {
      document.body.classList.remove('maximized')
      this.restoreCoordinatesAndSwitchStatus()
    }
  
    private rememberCoordinatesAndSwitchStatus() {
      this.rememberedCoordinates = {
        left: window.screenLeft || window.screenX || 0,
        top: window.screenTop || window.screenY || 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }      
      this.currentStatus = 'max'
      this.setMaxButton = this.setRestoreButton
      vanella.maximize()
    }
  
    private restoreCoordinatesAndSwitchStatus() {
      vanella.unmaximize()
      window.resizeTo(this.rememberedCoordinates.width, this.rememberedCoordinates.height)
      window.moveTo(this.rememberedCoordinates.left, this.rememberedCoordinates.top)
      this.currentStatus = 'default'
      this.setMaxButton = this.setMaxButton
    }
  
    private switchToMaxStatus() {
      vanella.maximize()
      this.currentStatus = 'max'
    }

  
  }
  
  export default MaxAndRestoreStatusManager
  