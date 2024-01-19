declare const electronApi: any


// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls()
    }
}


function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        electronApi.minimize()
    })

    document.getElementById('max-button').addEventListener("click", event => {
        electronApi.maximize()
    })

    document.getElementById('restore-button').addEventListener("click", event => {
        electronApi.unmaximize()
    })

    document.getElementById('close-button').addEventListener("click", event => {
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

