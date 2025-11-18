import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useGetSeismic } from '../service/seismic-service';
import { format } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import { MonthPicker } from '@/components/ui/month-picker';
import { Button } from '@/components/ui/button';
import { Analytics } from '@vercel/analytics/react';

const Earthquake: React.FC = () => {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [styleReady, setStyleReady] = React.useState(false);
  const [month, setMonth] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState(0);
  const { data: rawSeismic, isPending, refetch } = useGetSeismic(month, refreshToken);
  const loadingMessage = "We're fetching earthquake data. Please wait…";
  
  const seismic = React.useMemo(() => {
    if (!rawSeismic || !rawSeismic.AllThisMonth) {
      return { type: 'FeatureCollection', features: [] };
    }
    
    const features = rawSeismic.AllThisMonth.map((quake: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [quake.longitude, quake.latitude]
      },
      properties: {
        datetime: quake.datetime,
        magnitude: quake.magnitude,
        depth: quake.depth,
        location: quake.location,
        month: quake.month
      }
    }));
    
    return {
      type: 'FeatureCollection',
      features: features
    };
  }, [rawSeismic]);

  const isCurrentMonth = (() => {
    if (!month) return true;
    const now = new Date();
    const currentMonth = format(now, 'MMMM yyyy');
    return month === currentMonth;
  })();

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/outdoors-v12`,
      center: [123.8854, 10.3157],
      zoom: 4.5,
    });
    map.on('load', () => {
      mapRef.current = map;
      setStyleReady(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setStyleReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapContainer.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (map.isStyleLoaded()) {
        map.resize();
      }
    });

    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [styleReady]);

  const handleMonthSelect = (date: Date | undefined) => {
    if (!date) {
      setMonth(null);
      refetch();
      return;
    }
  
    const currentMonthString = format(new Date(), 'MMMM yyyy');
    const selectedMonthString = format(date, 'MMMM yyyy');
  
    if (selectedMonthString === currentMonthString) {
      setMonth(null);
      refetch();
    } else {
      setMonth(selectedMonthString);
    }
  };

  const showPopupOnMap = (seismic: any) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const coordinates = seismic.geometry.coordinates;
    const props = seismic.properties || {};

    const content = `
      <div style="font-size:12px;line-height:1.2;max-width:250px;text-align:left">
        <div style="font-weight:600;margin-bottom:6px;text-align:left">Seismic Information</div>
        <div style="text-align:left"><b>Date:</b> ${props.datetime || 'N/A'}</div>
        <div style="text-align:left"><b>Magnitude:</b> ${props.magnitude || 'N/A'}</div>
        <div style="text-align:left"><b>Depth:</b> ${props.depth || 'N/A'}</div>
        <div style="text-align:left"><b>Location:</b> ${props.location || 'N/A'}</div>
        <div style="text-align:left"><b>Month:</b> ${props.month || 'N/A'}</div>
      </div>
    `;
    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, closeOnMove: false, focusAfterOpen: false });
    }
    popupRef.current.setLngLat(coordinates).setHTML(content).addTo(map);

    map.flyTo({
      center: coordinates,
      duration: 1000
    });
  };

  useEffect(() => {
    if (styleReady && month === null) {
      setMonth(null);
    }
  }, [styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !styleReady) return;

    const sourceId = 'earthquakes';
    const emptyFeatureCollection = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;

    if (map.getLayer('earthquake-points')) {
      map.removeLayer('earthquake-points');
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    const sourceData = seismic.features && seismic.features.length > 0 ? seismic : emptyFeatureCollection;
    
    map.addSource(sourceId, {
      type: 'geojson',
      data: sourceData as GeoJSON.FeatureCollection,
      cluster: false,
    });

    map.addLayer({
      id: 'earthquake-points',
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-color': [
          'interpolate', ['linear'], ['get', 'magnitude'],
          3.9, '#2ECC71',
          4.9, '#F1C40F',
          5.9, '#E67E22',
          6.9, '#E74C3C',
          7.9, '#8E44AD',
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, [
            'interpolate', ['linear'], ['get', 'magnitude'],
            1, 0.5,
            2, 1,
            3, 1.5,
            4, 2,
            5, 2.5,
            6, 3,
            7, 3.5,
          ],
          8, [
            'interpolate', ['linear'], ['get', 'magnitude'],
            1, 3,
            2, 5,
            3, 7,
            4, 9,
            5, 11,
            6, 13,
            7, 15,
          ],
          16, [
            'interpolate', ['linear'], ['get', 'magnitude'],
            1, 8,
            2, 12,
            3, 16,
            4, 20,
            5, 24,
            6, 28,
            7, 32,
          ]
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 0.7,
        'circle-stroke-color': '#ffffff',
      },
    });


    const showPopup = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const feature = e.features && e.features[0];
      if (!feature) return;
      const coordinates = (feature.geometry as any).coordinates.slice();
      const props = feature.properties || {};

      const content = `
        <div style="font-size:12px;line-height:1.2;max-width:250px">
          <div style="font-weight:600;margin-bottom:6px">Seismic Information</div>
          <div><b>Date:</b> ${props.datetime || 'N/A'}</div>
          <div><b>Magnitude:</b> ${props.magnitude || 'N/A'}</div>
          <div><b>Depth:</b> ${props.depth || 'N/A'}</div>
          <div><b>Location:</b> ${props.location || 'N/A'}</div>
          <div><b>Month:</b> ${props.month || 'N/A'}</div>
        </div>
      `;

      if (!popupRef.current) {
        popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, closeOnMove: false, focusAfterOpen: false });
      }
      popupRef.current.setLngLat(coordinates).setHTML(content).addTo(map);
    };

    map.off('click', 'earthquake-points', showPopup as any);
    map.on('click', 'earthquake-points', showPopup);
  }, [seismic, styleReady]);
  
  const headerRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex flex-col h-screen overflow-hidden lg:overflow-hidden">
      <header
        ref={headerRef}
        className="flex flex-col gap-y-1 flex-shrink-0 py-2 bg-white/90 border-b backdrop-blur-sm px-4 sm:px-8 lg:px-16"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-base sm:text-lg font-semibold">Philippines Earthquake Monitoring Map</p>
          </div>
        </div>
        <p className="text-muted-foreground text-xs leading-tight hidden sm:block">
          Visualize earthquake events and their magnitudes across the Philippines using live data from PHIVOLCS.
        </p>
      </header>
  
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-2 px-2 sm:px-4 lg:px-16 py-2 overflow-y-auto lg:overflow-hidden min-h-0">
        <div className="relative h-full min-h-[400px] lg:min-h-0 flex-1 flex-shrink-0">
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex items-end justify-end gap-1 hover:bg-transparent cursor-pointer">
            <MonthPicker
              selected={(() => {
                if (!month) return new Date();
                try {
                  return new Date(month + ' 01');
                } catch {
                  return new Date();
                }
              })()}
              onSelect={handleMonthSelect}
              className="h-8 sm:h-10 text-xs"
              disableFutureMonths={true}
              minYear={2018}
            />
            <Button
              onClick={() => {
                setMonth(null);
                setRefreshToken(Date.now());
              }}
              disabled={isPending}
              variant="ghost"
              size="sm"
              title="Refresh and go to current month"
              className="flex items-center gap-1 cursor-pointer h-8 sm:h-10"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 text-red-500 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
  
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10 rounded-md shadow-lg p-2 sm:p-3 w-33 sm:w-38 bg-white/80">
            <h4 className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Legend</h4>
            <div className="space-y-0.5 sm:space-y-1">
              {[
                { color: '#2ECC71', label: 'Minor, Less than 3.9' },
                { color: '#F1C40F', label: 'Light, 4.0-4.9' },
                { color: '#E67E22', label: 'Moderate, 5.0-5.9' },
                { color: '#E74C3C', label: 'Strong, 6.0-6.9' },
                { color: '#8E44AD', label: 'Major, 7.0-7.9' },
                { color: '#641E16', label: 'Great, 8.0+' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1 sm:gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-[0.6rem] sm:text-[0.65rem]">{label}</span>
                </div>
              ))}
            </div>
          </div>
  
          {isPending && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white/80 rounded-lg shadow-lg p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">{loadingMessage}</span>
              </div>
            </div>
          )}
  
          <div
            ref={mapContainer}
            className="w-full h-full rounded-lg border border-gray-200 min-h-[400px] lg:min-h-0 bg-gray-50"
          />
        </div>
  
        <div className="rounded-lg border flex flex-col w-full h-full min-h-[300px] lg:min-h-0 flex-shrink-0">
          <div className="p-2 sm:p-3 border-b flex items-start justify-between flex-shrink-0">
            <div className="flex flex-col">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                {isCurrentMonth ? 'Recent Earthquake Activity' : 'Previous Earthquake Activity'}
              </h3>
              <div className="text-[0.65rem] sm:text-xs text-muted-foreground text-left">
                {month === null ? format(new Date(), 'MMMM yyyy') : month}
              </div>
            </div>
          </div>
  
          <div className="flex-1 overflow-y-auto lg:overflow-y-auto min-h-0 bg-gray-50">
          {rawSeismic?.error ? (
            <div className="p-3 sm:p-4 text-center">
              <div className="text-red-500 mb-2">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm text-red-600 font-medium mb-2">Failed to load earthquake data</p>
              <p className="text-[0.6rem] sm:text-xs text-red-500 mb-3">
                {rawSeismic?.error.includes('Connection to earthquake.phivolcs.dost.gov.ph timed out') 
                  ? 'PHIVOLCS server is taking too long to respond. Please try again in a moment.'
                  : rawSeismic?.error.includes('Max retries exceeded')
                  ? 'Unable to connect to PHIVOLCS data source. The server may be temporarily unavailable.'
                  : 'There was an error fetching the latest earthquake data.'}
              </p>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
            </div>
          ) : isPending ? (
          <div className="divide-y divide-primary-foreground">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="p-2 sm:p-3 w-full">
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-1 w-full">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse"></div>
                      <div className="h-3 sm:h-4 w-full bg-primary-foreground rounded animate-pulse"></div>
                      <div className="h-2 sm:h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-2 sm:h-3 w-full bg-primary-foreground rounded animate-pulse mb-1"></div>
                    <div className="h-2 sm:h-3 w-full bg-gray-100 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !seismic.features || seismic.features.length === 0 ? (
          <div className="p-3 sm:p-4 text-center text-primary-foreground">
            <p className="text-xs sm:text-sm">No earthquake activity data available</p>
          </div>
        ) : (
          <div className="divide-y divide-primary-foreground">
            {(() => {
              const allFeatures = seismic.features || [];
              const top20 = allFeatures.slice(0, 200);
              const additionalModerateToGreat = allFeatures.filter(
                (f: any, i: number) => i >= 20 && parseFloat(f.properties?.magnitude || "0") >= 4.0
              );
              const displayedFeatures = [...top20, ...additionalModerateToGreat];

              const getMagnitudeColor = (mag: number) => {
                if (mag < 4.0) return "bg-[#2ECC71]";
                if (mag < 5.0) return "bg-[#F1C40F]";
                if (mag < 6.0) return "bg-[#E67E22]";
                if (mag < 7.0) return "bg-[#E74C3C]";
                if (mag < 8.0) return "bg-[#8E44AD]";
                return "bg-[#641E16]";
              };

              const getTimeAgo = (datetime: string) => {
                if (!datetime) return "Unknown";
                try {
                  const match = datetime.match(
                    /^(\d{2}) (\w+) (\d{4}) - (\d{2}):(\d{2}) (AM|PM)$/
                  );
                  if (!match) return "Unknown";

                  const [, day, monthName, year, hour, minute, ampm] = match;
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];
                  const monthIndex = months.findIndex(
                    (m) => m.toLowerCase() === monthName.toLowerCase()
                  );
                  if (monthIndex === -1) return "Unknown";

                  let hourNum = parseInt(hour, 10);
                  if (ampm === "PM" && hourNum !== 12) hourNum += 12;
                  if (ampm === "AM" && hourNum === 12) hourNum = 0;

                  const dateObj = new Date(
                    parseInt(year, 10),
                    monthIndex,
                    parseInt(day, 10),
                    hourNum,
                    parseInt(minute, 10)
                  );

                  const now = new Date();
                  const diffInMs = now.getTime() - dateObj.getTime();
                  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                  if (diffInMinutes < 1) return "Just now";
                  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                  if (diffInHours < 24) return `${diffInHours}h ago`;
                  return `${diffInDays}d ago`;
                } catch {
                  return "Unknown";
                }
              };

              return (
                <>
                  {top20.map((seismic: any, index: number) => {
                    const props = seismic.properties || {};
                    const magnitude = props.magnitude || 0;
                    return (
                      <div
                        key={`recent-${index}`}
                        className="p-2 sm:p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => showPopupOnMap(seismic)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${getMagnitudeColor(
                                    magnitude
                                  )}`}
                                ></div>
                                <span className="text-xs sm:text-sm font-medium text-primary">
                                  M {props.magnitude || "N/A"}
                                </span>
                                <span className="text-[0.6rem] sm:text-xs text-muted-foreground">
                                  {props.depth || "N/A"} km deep
                                </span>
                              </div>
                              <span className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground">
                                {getTimeAgo(props.datetime)}
                              </span>
                            </div>
                            <div className="flex flex-col items-start">
                              <p
                                className="text-[0.6rem] sm:text-xs text-secondary-foreground break-words whitespace-pre-line text-left"
                                title={props.location}
                              >
                                {props.location || "Unknown location"}
                              </p>
                              <p className="text-[0.55rem] sm:text-[0.65rem] text-muted-foreground mt-1">
                                {props.datetime || "Unknown time"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {additionalModerateToGreat.length > 0 && (
                    <div className="text-center py-1 text-[0.6rem] text-muted-foreground bg-gray-100 font-semibold">
                    </div>
                  )}

                  {additionalModerateToGreat.map((seismic: any, index: number) => {
                    const props = seismic.properties || {};
                    const magnitude = props.magnitude || 0;
                    return (
                      <div
                        key={`strong-${index}`}
                        className="p-2 sm:p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => showPopupOnMap(seismic)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${getMagnitudeColor(
                                    magnitude
                                  )}`}
                                ></div>
                                <span className="text-xs sm:text-sm font-medium text-primary">
                                  M {props.magnitude || "N/A"}
                                </span>
                                <span className="text-[0.6rem] sm:text-xs text-muted-foreground">
                                  {props.depth || "N/A"} km deep
                                </span>
                              </div>
                              <span className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground">
                                {getTimeAgo(props.datetime)}
                              </span>
                            </div>
                            <div className="flex flex-col items-start">
                              <p
                                className="text-[0.6rem] sm:text-xs text-secondary-foreground break-words whitespace-pre-line text-left"
                                title={props.location}
                              >
                                {props.location || "Unknown location"}
                              </p>
                              <p className="text-[0.55rem] sm:text-[0.65rem] text-muted-foreground mt-1">
                                {props.datetime || "Unknown time"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <p className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground text-center py-1 sm:py-2">
                    Showing {displayedFeatures.length} earthquakes of {allFeatures.length}
                  </p>
                </>
              );
            })()}
          </div>
          )}
          </div>
        </div>
      </main>
  
      <footer className="flex-shrink-0 px-4 sm:px-8 lg:px-16 py-2 bg-white/90 border-t backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2 text-[0.6rem] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Data Source:</span>
            <a
              href="https://earthquake.phivolcs.dost.gov.ph/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline italic"
            >
              PHIVOLCS Earthquake Information
            </a>
          </div>
          <div className="flex items-center gap-1">
            <span>Developed by:</span>
            <span className="font-medium text-muted-foreground">Kay Shamir 🖤</span>
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  );    
};

export default Earthquake;