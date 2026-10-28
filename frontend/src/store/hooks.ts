// ============================================================================
// hooks.ts — typed versions of useDispatch / useSelector.
//
// Plain useDispatch() does not know about our thunks, and plain useSelector()
// does not know the shape of our state. These wrappers fix that once, so every
// component gets autocomplete instead of `any`.
// ============================================================================

import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
