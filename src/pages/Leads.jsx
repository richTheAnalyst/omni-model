import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { LinkButton } from '../components/Button.jsx'
import Button from '../components/Button.jsx'
import { LeadCards, LeadsTable } from '../components/LeadList.jsx'
import { ScoreLegend } from '../components/ScoreBadge.jsx'
import { EmptyState, ErrorPanel, ResultsSkeleton } from '../components/States.jsx'
import { industryLabel } from '../config/markets.js'
import { COPY } from '../config/product.js'
import { useDocumentTitle, useMediaQuery } from '../hooks/hooks.js'
import { getBand, toPercent, bestEntry } from '../lib/score.js'
import { countByOwnership, filterLeads, ownershipOf } from '../lib/ownership.js'
import { runSearch } from '../store/searchSlice.js'
import { selectActiveProfile, selectDncById, selectResultLeads } from '../store/selectors.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'strong', label: 'Strong fit' },
  { id: 'potential', label: 'Potential fit' },
  { id: 'low', label: 'Low fit' },
]

import { countByOwnership, filterLeads, ownershipOf } from '../lib/ownership.js'
const OWNER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'government', label: 'Government & public sector' },
  { id: 'non_government', label: 'Non-government' },
]

export default function Leads() {
  useDocumentTitle('Leads')
  const dispatch = useDispatch()
  const profile = useSelector(selectActiveProfile)
  const status = useSelector((s) => s.search.status)
  const error = useSelector((s) => s.search.error)
  const pending = useSelector((s) => s.search.pending)
  const lastQuery = useSelector((s) => s.search.lastQuery)
  const leads = useSelector(selectResultLeads)
  const dncById = useSelector(selectDncById)
  const isMobile = useMediaQuery('(max-width: 719px)')
  const [filter, setFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
