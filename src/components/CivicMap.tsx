import { useEffect } from 'react'
import L, { type LatLngExpression } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

export function darkIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="civic-pin" style="background:${color};color:${color};box-shadow:0 0 14px ${color}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color: string
}

export function CivicMap({
  center,
  zoom = 12,
  markers = [],
  onPinClick,
  onMapClick,
  flyToId,
  children,
}: {
  center: LatLngExpression
  zoom?: number
  markers?: MapMarker[]
  onPinClick?: (id: string) => void
  onMapClick?: () => void
  flyToId?: string | null
  children?: React.ReactNode
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
      attributionControl={false}
      zoomControl={false}
    >
      <TileLayer url={DARK_TILES} attribution={ATTR} />
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={darkIcon(m.color)}
          eventHandlers={{ click: () => onPinClick?.(m.id) }}
        />
      ))}
      <ClickCatcher onMapClick={onMapClick} />
      <FlyTo id={flyToId} markers={markers} />
      {children}
    </MapContainer>
  )
}

function ClickCatcher({ onMapClick }: { onMapClick?: () => void }) {
  useMapEvents({
    click: () => onMapClick?.(),
  })
  return null
}

function FlyTo({ id, markers }: { id?: string | null; markers: MapMarker[] }) {
  const map = useMap()
  useEffect(() => {
    if (!id) return
    const m = markers.find((x) => x.id === id)
    if (m) {
      map.flyTo([m.lat, m.lng], 14, { duration: 0.7 })
    }
  }, [id, markers, map])
  return null
}
