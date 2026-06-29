import { useState } from 'react'
import { useCareer } from '../../hooks/useCareer'
import { TrackPicker } from './TrackPicker'
import { RoadmapView } from './RoadmapView'

export function CareerPage() {
  const { track } = useCareer()
  const [, force] = useState(0)
  const rerender = () => force(n => n + 1)

  return track
    ? <RoadmapView onReset={rerender} />
    : <TrackPicker onReady={rerender} />
}
