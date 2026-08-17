import { useEffect, useState } from 'react'
import {
  getRoute,
  navigate,
  onRouteChange,
  getHashQuery,
  navigateWithQuery,
  type RouteId,
} from '@/router'

export function useHashRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(getRoute)

  useEffect(() => onRouteChange(setRoute), [])

  return route
}

export { navigate, getHashQuery, navigateWithQuery, type RouteId }