import { useCareer } from '../../hooks/useCareer'
import { TrackPicker } from './TrackPicker'
import { RoadmapView } from './RoadmapView'

export function CareerPage() {
  const career = useCareer()
  return career.track
    ? <RoadmapView career={career} />
    : <TrackPicker setTrack={career.setTrack} />
}
