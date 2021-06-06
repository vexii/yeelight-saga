import createSagaMiddleware from "redux-saga"
import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit"
import { createLogger } from "redux-logger"
import { DiscoverAndListen, reducer } from "./saga"
import { fork } from "redux-saga/effects"

const reduxLogger = createLogger({})

function configureAppStore() {
  const sagaMiddleware = createSagaMiddleware()
  const store = configureStore({
    reducer,
    middleware: [
      ...getDefaultMiddleware({ thunk: false }),
      sagaMiddleware,
      reduxLogger,
    ],
    devTools: true,
  })

  sagaMiddleware.run(function* () {
    yield fork(DiscoverAndListen)
    console.log("wee")
  })
  return store
}

export default configureAppStore()
