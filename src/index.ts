import { createApp } from 'vue'
import Index from './views/Index.vue'
import Classroom from './views/Classroom.vue'

// Vuetify
import 'vuetify/dist/vuetify.min.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from '../node_modules/vuetify/lib/iconsets/mdi.mjs'
import * as components from '../node_modules/vuetify/lib/components'
import * as directives from '../node_modules/vuetify/lib/directives'
import './assets/scss/main.scss'

import Database from './ts/Database'
import Comm from './ts/Comm'

var app
var peers = {}

const init = () => {
  const database = new Database()

  window['edrys'] = {
    database,
    index: [],
  }
}

const load = async () => {
  window['edrys'].index = await window['edrys'].database.getAll()
}

const seed = () => {
  for (const item of window['edrys'].index) {
    if (!peers[item.id]) {
      console.warn('client does not exists', item.id)
      const comm = new Comm(item)

      peers[item.id] = comm
    }
  }
}

const pathToRegex = (path) =>
  new RegExp('^' + path.replace(/\//g, '\\/').replace(/:\w+/g, '(.+)') + '$')

const getParams = (match) => {
  const values = match.result.slice(1)
  const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(
    (result) => result[1]
  )

  let params = Object.fromEntries(
    keys.map((key, i) => {
      return [key, values[i]]
    })
  )

  if (match.params) {
    params = { ...params, ...match.params }
  }

  return params
}

export const navigateTo = (url: string, replace?: boolean) => {
  if (replace) {
    history.replaceState(null, '', url)
  } else {
    history.pushState(null, '', url)
  }
  router()
}

const router = async () => {
  if (!window['edrys']) {
    init()
  }

  await load()

  seed()

  const routes = [
    { path: '/', view: Index },
    { path: '/classroom/:id', view: Classroom, params: { station: false } },
    { path: '/station/:id', view: Classroom, params: { station: true } },
  ]

  const potentialMatches = routes.map((route) => {
    return {
      route: route,
      result: location.search.slice(1).match(pathToRegex(route.path)),
      redirect: route.redirect,
      params: route.params,
    }
  })

  let match = potentialMatches.find(
    (potentialMatches) => potentialMatches.result !== null
  )

  if (!match) {
    match = {
      route: routes[0],
      result: [location.search],
    }
  }

  if (match.redirect) {
    navigateTo(match.redirect, true)
    return
  }

  const params = getParams(match)
  const view = match.route.view

  const vuetify = createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi,
      },
    },
  })

  if (params.id) {
    params.comm = peers[params.id]
  }

  app?.unmount()
  app = createApp(view, params)
  app.use(vuetify)

  app.mount(document.body)
}

window.addEventListener('popstate', router)

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (e) => {
    if (e.target && e.target.matches('[data-link]')) {
      e.preventDefault()
      navigateTo(e.target.href)
    }
  })

  router()
})
