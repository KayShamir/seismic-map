export type SeismicFeature = {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    datetime: string;
    magnitude: number;
    depth: number;
    location: string;
    month: string;
  };
};

export type SeismicFeatureCollection = {
  type: 'FeatureCollection';
  features: SeismicFeature[];
};
