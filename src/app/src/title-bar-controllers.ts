import Manager from './window-max-and-restore-status-manager'
import { willClose } from './interaction-messages'

declare const vanella: any

document.addEventListener('readystatechange', () => {
    if (document.readyState == 'complete') {
        handleWindowControls()
    }
})


function handleWindowControls() {
    document.getElementById('min-button')?.addEventListener('click', event => {
        vanella.minimize()
    })

    const manager = new Manager(
        document.getElementById('max-button') as HTMLElement,
        document.getElementById('restore-button') as HTMLElement
    )

    document.getElementById('close-button')?.addEventListener('click', event => {
        vanella.toClose()
    })

    window.addEventListener('resize', toggleMaxRestoreButtons)
}


const toggleMaxRestoreButtons = e => {
    if (window.outerHeight === screen.availHeight && window.outerWidth === screen.availWidth) {
        document.body.classList.add('maximized')
    } else {
        document.body.classList.remove('maximized')
    }
}

