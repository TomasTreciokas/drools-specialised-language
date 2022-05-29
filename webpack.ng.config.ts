import { Configuration, EntryObject } from 'webpack';

export default (config: Configuration): Configuration => {
  return {
    ...config,
    externals: [
      {
        'froala-editor': 'root FroalaEditor',
        'angular': 'root angular'
      }
    ]
  };
};
