let createPDFButton = document.getElementById('create-pdf');
let statusInfo = document.getElementById('status-info');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createPDF(postsArray) {
    
}

function getPostsFromCurrentPage(currentPageHTML) {
    let postsArray = []

    let postElements = currentPageHTML.getElementsByClassName('content');

    for (const postElement of postElements) {
        let post = postElement.innerText.trim();
        // chrome.extension.getBackgroundPage().console.log(post)
        postsArray.push(post);
    }

    return postsArray;
}

function fetchCurrentPage(url) {
    return new Promise((resolve, reject) => {
        const request = new Request(url);

        fetch(request)
            .then(response => {
                if (response.status === 200) {
                    return response.text();
                } else {
                    throw new Error('Something went wrong on api server!');
                }
            })
            .then(text => {
                // Convert the HTML string into a document object
                let parser = new DOMParser();
                let html = parser.parseFromString(text, 'text/html');
                resolve(html);
            }).catch(error => {
                chrome.extension.getBackgroundPage().console.log(error);
                reject(error)
            });

    });
}

function getNumberOfPages(url) {
    return new Promise((resolve, reject) => {
        let numberOfPages = 1;

        fetchCurrentPage(url)
            .then((currentPageHTML) => {
                let pageNumberElement = currentPageHTML.getElementsByClassName('pager')[0];

                if (pageNumberElement.hasAttribute('data-pagecount')) {
                    numberOfPages = pageNumberElement.getAttribute('data-pagecount');
                }

                resolve(numberOfPages);
            })
            .catch((error) => {
                chrome.extension.getBackgroundPage().console.log(error);
                reject(error)
            });
    });
}

function isCurrentUrlValid(url) {
    let patt = /eksisozluk\.com\/.+/i;
    return url.search(patt) !== -1 ? true : false;
}

async function startParsing(url) {
    createPDF.disabled = true;
    statusInfo.innerHTML = "Lütfen Bekleyiniz...";
    statusInfo.style.marginBottom = "8px";

    let regexRemovePageNumberQuery = /\?p=\d+/;
    url = url.replace(regexRemovePageNumberQuery, '');

    let numberOfPages = await getNumberOfPages(url);
    let postsArray = [];
    for (let i = 1; i <= numberOfPages; i++) {
        let urlToParse = url + `?p=${i}`;
        let currentPageHTML = await fetchCurrentPage(urlToParse);
        await sleep(1000);
        let postsOfCurrentPage = getPostsFromCurrentPage(currentPageHTML);
        postsArray.concat(postsOfCurrentPage);
        break;
    }

    createPDF();
}

createPDFButton.onclick = function (element) {

    chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    }, tabs => {
        let url = tabs[0].url;

        if (!isCurrentUrlValid(url)) {
            alert("Bulunduğunuz sayfa bir Ekşi Sözlük başlığı değildir!")
        } else {
            startParsing(url);
        }
    });
};