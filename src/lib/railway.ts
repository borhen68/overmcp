import http from "./http";

const RAILWAY_API = "https://backboard.railway.app/graphql/v2";

export interface RailwayProject {
  id: string;
  name: string;
  services: { id: string; name: string }[];
}

async function railwayQuery(token: string, query: string, variables?: Record<string, unknown>) {
  const { data } = await http.post(
    RAILWAY_API,
    { query, variables },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return data.data;
}

export async function listRailwayProjects(token: string): Promise<RailwayProject[]> {
  const data = await railwayQuery(token, `
    query {
      me {
        projects {
          edges {
            node {
              id
              name
              services {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.me.projects.edges || []).map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name,
    services: (edge.node.services?.edges || []).map((s: any) => ({
      id: s.node.id,
      name: s.node.name,
    })),
  }));
}

export async function redeployRailway(
  token: string,
  serviceId: string,
  environmentId: string
): Promise<boolean> {
  const data = await railwayQuery(token, `
    mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `, { serviceId, environmentId });

  return !!data.serviceInstanceRedeploy;
}
