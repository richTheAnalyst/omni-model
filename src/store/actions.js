import { createAction } from '@reduxjs/toolkit'

// Shared actions that several slices react to.
export const localDataCleared = createAction('app/localDataCleared')
export const exportLogged = createAction('app/exportLogged')
