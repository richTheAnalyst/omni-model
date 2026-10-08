import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { ComboBoxField, SelectField, TextField } from '../components/Fields.jsx'
import { ScoreLegend } from '../components/ScoreBadge.jsx'
import { countryNames } from '../config/markets.js'
import { cityOptions, regionOptions, sectorOptions } from '../config/profile.js'
import { COPY } from '../config/product.js'
import { useDocumentTitle } from '../hooks/hooks.js'
import { normalizeRegion, normalizeSector } from '../lib/format.js'
import { profileWithSector } from '../config/profile.js'
import { formChanged, startSearch } from '../store/searchSlice.js'
import { selectActiveProfile } from '../store/selectors.js'

const MAX_LIMIT = 20

export default function FindLeads() {
  useDocumentTitle('Find Leads')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const profile = useSelector(selectActiveProfile)
  const form = useSelector((s) => s.search.form)
  const searching = useSelector((s) => s.search.status === 'loading')
  const [touched, setTouched] = useState(false)

  const countries = useMemo(() => countryNames(), [])
  const regions = useMemo(() => regionOptions(profile, form.country), [profile, form.country])
  const cities = useMemo(
    () => cityOptions(profile, form.country, form.region),
    [profile, form.country, form.region],
  )
  const sectors = useMemo(() => sectorOptions(profile), [profile])

  // A saved form can point at a country that is no longer in the list.
  useEffect(() => {
    if (!countries.includes(form.country)) dispatch(formChanged({ country: countries[0] }))
  }, [dispatch, form.country, countries])

  const setCountry = (country) => {
    dispatch(formChanged({ country, region: '', city: '' }))
  }
  const setRegion = (region) => {
    dispatch(formChanged({ region, city: '' }))
  }
  const setMax = (raw) => {
    const n = Math.round(Number(raw))
    dispatch(formChanged({ maxResults: Number.isFinite(n) ? Math.min(MAX_LIMIT, Math.max(1, n)) : 10 }))
  }

  const errors = {
    region: !form.region ? 'Choose a region.' : '',
    city: !form.city.trim() ? 'Choose or enter a city.' : '',
    sector: !form.sector ? 'Choose an industry.' : '',
  }
  const valid = !errors.region && !errors.city && !errors.sector

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || searching) return
    // Pass the raw sector (user's original input) to the search thunk.
    // The thunk will normalize it for the API key but preserve the label.
    const region = normalizeRegion(form.region)
    dispatch(formChanged({ region }))
    const { country, ...query } = { ...form, region }
    dispatch(startSearch({ ...query, profileId: profile.id }))
    navigate('/leads')
  }

  return (
    <div className="page page-narrow-wide">
      <header className="page-head">
        <p className="eyebrow">Step 1 of 2 · Define your market</p>
        <h1>Find Leads</h1>
        <p className="lead">Tell Omni Model who you’re looking for.</p>
      </header>

      <div className="find-layout">
        <form className="panel form-panel" onSubmit={submit} noValidate>
          <div className="form-grid">
            <SelectField
              label="Country"
              value={form.country}
              onChange={setCountry}
              options={countries.map((c) => ({ value: c, label: c }))}
              required
            />

            <ComboBoxField
              label="Region"
              value={form.region}
              onChange={setRegion}
              placeholder="Choose or type a region"
              options={regions}
              required
              hint={touched && errors.region ? errors.region : undefined}
            />

            <ComboBoxField
              label="City"
              value={form.city}
              onChange={(v) => dispatch(formChanged({ city: v }))}
              placeholder={form.region ? 'Choose or type a city' : 'Choose a region first'}
              disabled={!form.region}
              options={cities}
              required
              maxLength={80}
              hint={touched && errors.city ? errors.city : undefined}
            />

            <ComboBoxField
              label="Industry"
              value={form.sector}
              onChange={(sector) => dispatch(formChanged({ sector }))}
              placeholder="Choose or type an industry"
              options={sectors}
              required
              hint={touched && errors.sector ? errors.sector : undefined}
            />

            <TextField
              label="Maximum results"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LIMIT}
              step={1}
              value={form.maxResults}
              onChange={setMax}
              hint={`From 1 to ${MAX_LIMIT} companies.`}
            />
          </div>

          <div className="form-foot">
            <Button type="submit" variant="primary" size="lg" iconRight="arrow" loading={searching}>
              {searching ? COPY.loading.search : 'Find Leads'}
            </Button>
          </div>
        </form>

        <aside className="panel panel-flat find-aside" aria-labelledby="score-guide-title">
          <h2 id="score-guide-title" className="panel-title">How companies are scored</h2>
          <ScoreLegend />
        </aside>
      </div>
    </div>
  )
}
