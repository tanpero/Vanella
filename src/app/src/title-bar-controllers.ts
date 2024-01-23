import Manager from './window-max-and-restore-status-manager'

declare const electronApi: any

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls()
    }
}


function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button')?.addEventListener("click", event => {
        electronApi.minimize()
    })

    const manager = new Manager(document.getElementById('max-button') as HTMLElement, document.getElementById('restore-button') as HTMLElement)

    document.getElementById('close-button')?.addEventListener("click", event => {
        electronApi.close()
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

