import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { installGlobalErrorReporting } from './lib/observability'
import './styles/global.css'

installGlobalErrorReporting()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
