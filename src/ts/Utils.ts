import * as YAML from 'js-yaml'

function loadResource(type, url, base) {
  if (url.match(/(https?)?:\/\//i)) {
    if (type === 'script') {
      return `<script src="${url}"></script>`
    } else {
      return `<link rel="stylesheet" href="${url}" />`
    }
  }

  const absoluteURL = new URL(url, base).toString()

  return `<script>
        fetch("${absoluteURL}")
        .then((response) => response.text())
        .then((code) => {
            const blob = new Blob([code], { type: "text/${type}" })
            const blobUrl = window.URL.createObjectURL(blob)

            switch("${type}") {
                case "script": {
                    const tag = document.createElement('script')
                    tag.setAttribute('src', blobUrl)
                    document.head.appendChild(tag)
                    break
                }
                case "css": {
                    const tag = document.createElement('link')
                    tag.setAttribute('rel', 'stylesheet')
                    tag.setAttribute('href', blobUrl)
                    document.head.appendChild(tag)
                    break
                }
                default: {
                    console.warn("Unknown type: ${type}")
                }
            }
        })
        .catch((e) => {
            console.warn("failed to fetch: ${absoluteURL}")
        })
    </script>
    `
}

function replace(code, baseURL) {
  try {
    let head = code.match(/<head>.*?<\/head>/is)[0]

    head = head.replace(
      /<script.*?src=(?:'|")([^"']+)(?:'|").*?>.*?<\/script>/gims,
      (pat) => {
        let url = pat.match(/src=(?:'|")([^"']+)(?:'|")/is)

        if (url) {
          url = url[1]

          if (!(url.startsWith('https://') || url.startsWith('http://'))) {
            return loadResource('script', url, baseURL)
          }
        }

        return pat
      }
    )

    head = head.replace(
      /<link.*?href=(?:'|")([^"']+)(?:'|").*?>/gims,
      (pat) => {
        let url = pat.match(/href=(?:'|")([^"']+)(?:'|")/is)

        if (url) {
          url = url[1]

          if (!(url.startsWith('https://') || url.startsWith('http://'))) {
            return loadResource('css', url, baseURL)
          }
        }

        return pat
      }
    )

    return code.replace(/<head>.*?<\/head>/is, head)
  } catch (e) {
    console.warn('problems parsing html:', e)
  }
}

export function copyToClipboard(str: string) {
  navigator.clipboard.writeText(str)
}

export function parseClassroom(config: string) {
  let classroom

  console.warn('parse Classroom', config)

  try {
    classroom = parse(config)

    if (classroom) {
      // guarantees that older modules without a custom show can be loaded
      for (let i = 0; i < classroom.modules; i++) {
        classroom.modules[i].showInCustom =
          classroom.modules[i].showInCustom || classroom.modules[i].showIn || ''
      }
    }
  } catch (e) {
    console.warn('could not parse classroom', e.message)
  }

  return classroom
}

export function parse(config: string): any {
  let data: any = undefined

  try {
    data = JSON.parse(config)
  } catch (e) {
    data = YAML.load(config)
  }

  return data
}

export function stringify(config: any): string {
  return YAML.dump(config)
}

export async function scrapeModule(module) {
  try {
    const response = await fetch(module.url)
    const content = await response.text()

    if (module.url.match(/\.ya?ml$/i)) {
      try {
        const yaml = YAML.load(content)

        const links = yaml.load?.links || []
        const scripts = yaml.load?.scripts || []

        const code = `<!DOCTYPE html>
                      <html>
                      <head>
                      ${links
                        .map((url) => {
                          return loadResource('css', url, module.url)
                        })
                        .join('\n')}
                      
                          ${scripts
                            .map((url) => {
                              return loadResource('script', url, module.url)
                            })
                            .join('\n')}

                          <style type="module">${yaml.style || ''}</style>
                          <script>${yaml.main}</script>
                          </head>
                          <body>
                          ${yaml.body || ''}
                          </body>
                          </html>
                          `

        return {
          ...module,
          name: yaml.name,
          description: yaml.description,
          icon: yaml.icon || 'mdi-package',
          shownIn: yaml['show-in'] || ['*'],
          srcdoc: 'data:text/html,' + escape(code),
          origin: '*',
        }
      } catch (error) {
        console.warn('loading yaml:', error)

        throw new Error('Could not load the YAML-declaration: ' + error.message)
      }
    } else {
      const moduleEl = document.createElement('html')
      moduleEl.innerHTML = content
      const meta = Object.fromEntries(
        Object.values(moduleEl.getElementsByTagName('meta')).map((m) => [
          m.name,
          m.content,
        ])
      )

      if (meta['fetch'] && meta['fetch'] !== 'false') {
        return {
          ...module,
          name:
            moduleEl.getElementsByTagName('title')[0].innerText || meta['name'],
          description: meta['description'],
          icon: meta['icon'] || 'mdi-package',
          shownIn: (meta['show-in'] || '*').replace(/\s+/g, '').split(','), // or 'station'
          srcdoc: 'data:text/html,' + escape(replace(content, module.url)),
          origin: '*',
        }
      }

      try {
        return {
          ...module,
          name:
            moduleEl.getElementsByTagName('title')[0].innerText || meta['name'],
          description: meta['description'],
          icon: meta['icon'] || 'mdi-package',
          shownIn: (meta['show-in'] || '*').replace(/\s+/g, '').split(','), // or 'station'
        }
      } catch (error) {
        throw new Error(
          'This does not seem to be a valid module declaration, check the URL manually.'
        )
      }
    }
  } catch (error) {
    return {
      ...module,
      name: '<Error: exception scraping module>',
      description: error,
      icon: 'mdi-alert',
      shownIn: '',
    }
  }
}

export function download(filename, text) {
  /**
   * https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
   */
  const element = document.createElement('a')
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
  )
  element.setAttribute('download', filename)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}

export function debounce(func, wait, immediate) {
  /**
   * https://davidwalsh.name/javascript-debounce-function
   */
  let timeout
  return function () {
    const context = this,
      args = arguments
    const later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

export function setToValue(obj, pathArr, value) {
  let i = 0

  for (i = 0; i < pathArr.length - 1; i++) {
    obj = obj[pathArr[i]]
    if (!obj[pathArr[i + 1]]) obj[pathArr[i + 1]] = {}
  }
  obj[pathArr[i]] = value
  // if (value == undefined)
  //     delete obj[pathArr[i]]
}

export function validateUrl(string: string) {
  try {
    const url = new URL(string)

    // URL: allows to define protocols such as `abc:` or `bla:`
    const protocols = [
      'http:',
      'https:',
      'file:',
      'ipfs:',
      'ipns:',
      'blob:',
      'dat:',
      'hyper:',
    ]
    if (protocols.includes(url.protocol)) {
      return true
    }
  } catch (err) {}

  return false
}

export function infoHash(length = 40) {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  // Pick characters randomly
  let str = ''
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return str
}

var SessionID: string | null = null

export function getPeerID(withSession = true) {
  let peerID = localStorage.getItem('peerID')
  if (!peerID) {
    peerID = infoHash(12)
    localStorage.setItem('peerID', peerID)
  }

  if (!SessionID) {
    SessionID = infoHash(6)
  }

  return withSession ? peerID + '_' + SessionID : peerID
}

export function getShortPeerID(id: string) {
  const ids = id.split('_')

  // peerID_sessionID
  if (ids.length == 2) {
    return ids[0].slice(6)
  }

  return id
}

export function clone(object: any) {
  if (object !== undefined) return JSON.parse(JSON.stringify(object))
}

export function removeKeysStartingWithSecret(obj: any) {
  for (let key in obj) {
    if (typeof obj[key] === 'object') {
      // Recursively call the function if the value is an object or an array
      removeKeysStartingWithSecret(obj[key])

      if (JSON.stringify(obj[key]) === '{}') {
        delete obj[key]
      }
    }
    // If the key starts with "secret", delete the key-value pair
    if (key.toLocaleLowerCase().startsWith('secret')) {
      delete obj[key]
    }
  }
}

export function deepEqual(object1, object2) {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)
  if (keys1.length !== keys2.length) {
    return false
  }
  for (const key of keys1) {
    const val1 = object1[key]
    const val2 = object2[key]
    const areObjects = isObject(val1) && isObject(val2)
    if (
      (areObjects && !deepEqual(val1, val2)) ||
      (!areObjects && val1 !== val2)
    ) {
      return false
    }
  }
  return true
}
function isObject(object) {
  return object != null && typeof object === 'object'
}
