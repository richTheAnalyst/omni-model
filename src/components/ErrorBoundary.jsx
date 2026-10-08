import { Component } from 'react'
import Button from './Button.jsx'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('[Omni Model] Render error:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page">
        <div className="state state-error" role="alert">
          <div className="state-body">
            <h3>This page couldn’t be displayed</h3>
            <p>Something unexpected went wrong. Your searches and drafts on this device are safe.</p>
            <div className="state-actions">
              <Button variant="primary" size="sm" icon="refresh" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
