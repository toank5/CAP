import { useEffect, useState } from 'react'
import {
  getRoute,
  navigate,
  onRouteChange,
  type RouteId,
} from '@/router'

export function useHashRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(getRoute)

  useEffect(() => onRouteChange(setRoute), [])

  return route
}

export { navigate, type RouteId }
