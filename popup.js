let createPDFButton = document.getElementById('create-pdf');
let statusInfo = document.getElementById('status-info');

// Simulate sleep for given time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create pdf with the given post elements
function createPDF(postsArray) {
    const reducer = (accumulator, currentValue) => accumulator + currentValue;

    // Wrap each element by <div> to add margin around.
    postsArray = postsArray.map(post => `<div style="margin:16px">` + post + `</div><hr style="border-top: 1px dashed #bbb;">`);
    
    // Reduce all posts into a single HTML element
    let posts = postsArray.reduce(reducer)
    
    // Convert and save
    html2pdf(posts);
}

// Parse each post's HTML code in the current page
function getPostsFromCurrentPage(currentPageHTML) {
    let postsArray = []

    // Find all posts in the current page
    let postElements = currentPageHTML.getElementsByClassName('content');

    // Iterate over each element
    for (const postElement of postElements) {
        // get InnerHTML from post element
        let post = postElement.innerHTML;

        // Add to postsArray
        postsArray.push(post);
    }

    return postsArray;
}

// Sends request to given URL and returns the HTML code of the page
function fetchCurrentPage(url) {
    return new Promise((resolve, reject) => {
        const request = new Request(url);

        fetch(request)
            .then(response => {
                if (response.status === 200) {
                    return response.text();
                } else {
                    alert("Bir hata meydana geldi :(")
                    //chrome.extension.getBackgroundPage().console.log(response);    
                }
            })
            .then(text => {
                // Convert the HTML string into a document object
                let parser = new DOMParser();
                let html = parser.parseFromString(text, 'text/html');
                resolve(html);
            }).catch(error => {
                //chrome.extension.getBackgroundPage().console.log(error);
                reject(error)
            });

    });
}

// Returns total number of pages in the topic
function getNumberOfPages(url) {
    return new Promise((resolve, reject) => {
        // By deafult, a topic has a single page
        let numberOfPages = 1;

        fetchCurrentPage(url)
            .then((currentPageHTML) => {
                // Parse HTML to find element which holds the total page number
                let pageNumberElement = currentPageHTML.getElementsByClassName('pager')[0];

                // If there is an element to indicate total number of pages
                if (pageNumberElement && pageNumberElement.hasAttribute('data-pagecount')) {
                    // Update total number of pages
                    numberOfPages = pageNumberElement.getAttribute('data-pagecount');
                }

                resolve(numberOfPages);
            })
            .catch((error) => {
                //chrome.extension.getBackgroundPage().console.log(error);
                reject(error)
            });
    });
}

// Check is the current page is a Ekşi Sözlük page
function isCurrentUrlValid(url) {
    let patt = /eksisozluk\.com\/.+/i;
    return url.search(patt) !== -1 ? true : false;
}

// Main Logic starts here...
async function startParsing(url) {
    createPDFButton.disabled = true;
    statusInfo.innerHTML = "Lütfen Bekleyiniz...";
    statusInfo.style.marginBottom = "8px";

    let regexRemovePageNumberQuery = /\?p=\d+/;
    url = url.replace(regexRemovePageNumberQuery, '');

    let numberOfPages = await getNumberOfPages(url);
    let postsArray = [];
    for (let i = 1; i <= numberOfPages; i++) {
        let urlToParse = url + `?p=${i}`;
        let currentPageHTML = await fetchCurrentPage(urlToParse);
        // Wait 1 second between each request
        await sleep(1000);
        let postsOfCurrentPage = getPostsFromCurrentPage(currentPageHTML);
        postsArray = postsArray.concat(postsOfCurrentPage);
    }
    
    createPDF(postsArray);
}

createPDFButton.onclick = function (element) {
    chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    }, tabs => {
        let url = tabs[0].url;

        // Check if the current page is a valid Ekşi Sözlük topic page
        if (!isCurrentUrlValid(url)) {
            alert("Bulunduğunuz sayfa bir Ekşi Sözlük başlığı değildir!")
        } else {
            startParsing(url);
        }
    });
};