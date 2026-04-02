import Resolver from '@forge/resolver';

const resolver = new Resolver();

resolver.define('getTasks', (req) => {
  // If tasks are passed via macro config, return them, else return defaults.
  const config = req.context.extension.config;
  if (config && config.tasksJson) {
    try {
      return JSON.parse(config.tasksJson);
    } catch (e) {
      console.warn("Invalid JSON in macro config, returning default tasks.");
    }
  }
  
  return [
    { id: '1', name: 'Project Kickoff', startDate: '2026-04-01', endDate: '2026-04-05', progress: 100 },
    { id: '2', name: 'Requirements Analysis', startDate: '2026-04-06', endDate: '2026-04-12', progress: 50 },
    { id: '3', name: 'Design Phase', startDate: '2026-04-13', endDate: '2026-04-20', progress: 20 },
    { id: '4', name: 'Implementation', startDate: '2026-04-15', endDate: '2026-05-15', progress: 5 },
  ];
});

export const handler = resolver.getDefinitions();

const configResolver = new Resolver();
export const configHandler = configResolver.getDefinitions();
