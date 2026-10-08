import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Icon, { Logo } from '../components/Icon.jsx'
import { ScoreLegend } from '../components/ScoreBadge.jsx'
import { COPY, PRODUCT, WORKFLOW } from '../config/product.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { welcomeSeen } from '../store/settingsSlice.js'

export default function Welcome() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  useDocumentTitle('')

  const start = () => {
    dispatch(welcomeSeen())
    navigate('/find')
  }
  const explore = () => {
    document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="welcome">
      <header className="welcome-bar">
        <Link to="/" className="brand brand-light" aria-label={PRODUCT.name}>
          <Logo />
          <span className="brand-name">{PRODUCT.name}</span>
        </Link>
        <Link
          to="/"
          className="welcome-skip"
          onClick={() => dispatch(welcomeSeen())}
        >
          Go to workspace
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-light">B2B sales intelligence</p>
          <h1>{COPY.hero.title}</h1>
          <p className="hero-body">{COPY.hero.body}</p>
          <div className="hero-actions">
            <Button variant="primary" size="lg" iconRight="arrow" onClick={start}>
              {COPY.hero.primary}
            </Button>
            <Button variant="outline-light" size="lg" onClick={explore}>
              {COPY.hero.secondary}
            </Button>
          </div>
        </div>
        <div className="hero-aside" aria-label="How Omni Model scores companies">
          <p className="eyebrow eyebrow-light">Every company gets a fit score</p>
          <ScoreLegend compact />
          <p className="hero-aside-foot">
            Scores are calculated per offering, so you see which of your services fits each company best.
          </p>
        </div>
      </section>

      <section id="platform" className="platform" aria-labelledby="platform-title">
        <div className="platform-inner">
          <p className="eyebrow">How Omni Model works</p>
          <h2 id="platform-title">From market to message in one workspace</h2>
          <ol className="steps">
            {WORKFLOW.map((step, i) => (
              <li key={step.title} className="step">
                <span className="step-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="trust">
            <div>
              <Icon name="check" />
              <h3>Signed by you</h3>
              <p>Type your business name, email, phone and the service you market once in Settings. Every draft uses them.</p>
            </div>
            <div>
              <Icon name="pen" />
              <h3>Drafts you stay in control of</h3>
              <p>{COPY.reviewDetail} Every draft is editable before you copy or export it.</p>
            </div>
            <div>
              <Icon name="block" />
              <h3>Honest about what it keeps</h3>
              <p>Searches, drafts and do-not-contact flags are saved on this device only. Nothing is stored on a server.</p>
            </div>
          </div>

          <div className="platform-cta">
            <Button variant="primary" size="lg" iconRight="arrow" onClick={start}>
              {COPY.hero.primary}
            </Button>
          </div>
        </div>
      </section>

      <footer className="welcome-foot">
        <p>{PRODUCT.tagline}</p>
      </footer>
    </div>
  )
}
