import { LinkButton } from '../components/Button.jsx'
import { EmptyState } from '../components/States.jsx'
import { useDocumentTitle } from '../hooks/hooks.js'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="page">
      <EmptyState
        icon="search"
        title="We can’t find that page"
        action={
          <LinkButton to="/" variant="primary">
            Go to Home
          </LinkButton>
        }
      >
        The link may be old or mistyped.
      </EmptyState>
    </div>
  )
}
