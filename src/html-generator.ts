export const generateHTML = (title: string, input: string, withStyle: boolean = false): string => {
    const lines = input.split('\n')
    
    const htmlHeader = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${withStyle ? insertStyle() : ''}
  </head>
  <body>
  <div class="container">`

    const htmlFooter = '\n</div>\n</body>\n</html>\n'
    
    // 组合头部、内容和尾部
    const formattedHTML = `${htmlHeader}\n${lines.join('\n')}${htmlFooter}\n`
    
    return formattedHTML
}

const insertStyle = () => {
    return String.raw`
  <style>
    body {
        background-color: black;
        display: flex;
        justify-content: center;
    }
    .container {
        color: white;
        width: 75%;
        filter: revert(0.862745) hue-rotate(180deg);
    }
    table{width:100%;border-collapse:collapse;border:3px solid #fff}table th,table td{border:1px solid #fff;padding:10px;vertical-align:middle;background-color:transparent;color:#fff}table th{background-color:#33333385;color:#fff}table thead{border-collapse:collapse;border-spacing:0}table thead td{height:0}table thead th{display:none;height:0;border:0}table thead th:first-child{border-left:0}table thead th:last-child{border-right:0}table thead th:not(:first-child):not(:last-child){border-left:0;border-right:0}table thead th:first-child:nth-last-child(2),table thead th:first-child:nth-last-child(2)~th{border-bottom:3px solid}table tbody tr>*{border:1px solid #fff;padding:5px;background-color:transparent}table tbody tr table,table tbody tr ul,table tbody tr ol,table tbody tr blockquote,table tbody tr img,table tbody tr svg{width:100%;margin:0;padding:0}table tbody tr table{border:1px solid #fff;margin-top:5px;margin-bottom:5px}table tbody tr ul,table tbody tr ol{list-style:none;padding-left:10px;margin-top:5px;margin-bottom:5px}table tbody tr blockquote{border-left:4px solid #333;padding:10px;margin:5px 0}table tbody tr img,table tbody tr svg{max-width:100%;height:auto}pre{position:relative}pre code{display:block;position:relative;border-radius:4px;font-family:Consolas,Monaco,monospace;overflow-x:auto}pre .filename{position:absolute;top:0;left:0;background:#f0f0f0;padding:.2em .5em;font-size:.8em;color:#666;border-bottom-right-radius:.3em}pre .language{position:absolute;top:0;left:0;background:#e0e0e0;padding:.2em .5em;font-size:.8em;color:#333;border-bottom-right-radius:.3em}pre .file-name,pre .language-name{padding:4px 8px;margin-bottom:4px;display:inline-block}pre .file-name{background-color:#eef;color:#007acc;border-radius:4px}pre .language-name{background-color:#efe;color:#282;border-radius:4px}h1,h2,h3,h4,h5,h6{margin-top:15px;box-sizing:border-box;color:#dedede}h1:empty,h2:empty,h3:empty,h4:empty,h5:empty,h6:empty{display:none}h1{padding-top:20px;padding-bottom:10px;margin-bottom:10px;border-bottom-color:#cbcbcb;border-bottom-style:solid;border-bottom-width:1px;font-size:2.5rem}h2{padding-top:15px;padding-bottom:5px;margin-bottom:8px;border-bottom-color:#aaa;border-bottom-style:solid;border-bottom-width:1px;font-size:1.8rem}h3{padding-top:10px;padding-bottom:5px;font-size:1.4rem}h4{padding-top:8px;margin-bottom:0;font-size:1.2rem}h5{margin-bottom:0;font-size:1.1rem}h6{margin-bottom:0;font-size:1rem}.container>h1:first-child,.container>h2:first-child,.container>h3:first-child,.container>h4:first-child,.container>h5:first-child,.container>h6:first-child{margin-top:30px}p{text-indent:2em;margin-bottom:1.326em;white-space:break-spaces;word-wrap:break-word;word-break:break-all;line-height:2.7em}a{text-decoration:underline;color:#14e692}a:active,a:hover{color:#14cae6}a:active,a:hover{cursor:pointer}.dropcap{color:red;float:left;font-size:5rem;line-height:3.5rem;margin:0;padding:.5rem}.invisible{clip:rect(1px,1px,1px,1px);height:1px;overflow:hidden;position:absolute;top:auto;white-space:nowrap;width:1px;display:none}img{max-width:80%;max-height:80%;margin:auto;display:block}ul{list-style-type:none;padding-left:2em;margin:0}ul>li{position:relative;padding-left:1em;margin-bottom:.5em}ul>li:before{content:"\2022";position:absolute;left:-1em;color:#7d8a9f}ol{list-style-type:none;counter-reset:li;padding-left:2em;margin:0}ol>li{position:relative;padding-left:1em;margin-bottom:.5em}ol>li:before{content:counter(li) ". ";counter-increment:li;position:absolute;left:-2em;width:2em;text-align:right;color:#7d8a9f}blockquote{display:block;clear:both;font-size:1em;font-style:normal;line-height:1.8;text-indent:0;border:none;color:#c1d5b9;margin-block-start:1em;margin-block-end:1em;margin-inline-start:40px;margin-inline-end:40px;position:relative;padding-top:20px;padding-bottom:20px}blockquote:before{content:"\201c";left:0;top:0;transform:translateY(-100%) translate(-100%);color:#e0e0e0;font-size:4em;font-family:Arial,serif;line-height:1em;font-weight:700;position:absolute;margin-top:1em;margin-bottom:1em}blockquote:after{content:"\201d";right:0;bottom:0;transform:translateY(100%) translate(100%);color:#e0e0e0;font-size:4em;font-family:Arial,serif;line-height:1em;font-weight:700;position:absolute;margin-top:1em;margin-bottom:1em}ul[name=user-content-table-of-contents]{list-style-type:none;padding-left:2em;margin:0}ul[name=user-content-table-of-contents] p{text-indent:0;margin:0;padding:0}ul[name=user-content-table-of-contents]>li{position:relative;padding-left:1em;margin-bottom:.3em}ul[name=user-content-table-of-contents]>li:before{display:none}ul[name=user-content-table-of-contents]>li ul{list-style-type:none;padding-left:2em}ul[name=user-content-table-of-contents]>li ul>li{position:relative;padding-left:1em;margin-bottom:.3em}ul[name=user-content-table-of-contents]>li ul>li:before{display:none}ul[name=user-content-table-of-contents]>li ul>li ul{padding-left:4em}pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{background:#272822;color:#ddd}.hljs-tag,.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-strong,.hljs-name{color:#f92672}.hljs-code{color:#66d9ef}.hljs-attribute,.hljs-symbol,.hljs-regexp,.hljs-link{color:#bf79db}.hljs-string,.hljs-bullet,.hljs-subst,.hljs-title,.hljs-section,.hljs-emphasis,.hljs-type,.hljs-built_in,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-addition,.hljs-variable,.hljs-template-tag,.hljs-template-variable{color:#a6e22e}.hljs-title.class_,.hljs-class .hljs-title{color:#fff}.hljs-comment,.hljs-quote,.hljs-deletion,.hljs-meta{color:#75715e}.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-doctag,.hljs-title,.hljs-section,.hljs-type,.hljs-selector-id{font-weight:700}
  </style>`
}
