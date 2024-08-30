# Strapi on AWS with CDK

This is a sample CDK project to deploy [Strapi](https://strapi.io/) on AWS using the [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/home.html) with best practices for AWS, CDK, and Strapi.

It provides an easy way to set up a production-ready Strapi application on AWS with a serverless and highly available architecture, managed database, and secure access.

## Architecture Overview

![Architecture Diagram](./docs/architecture.svg)

The architecture consists of the following components:

- **Strapi Application**: The Strapi application is deployed as a Docker container on an Amazon Elastic Container Service (ECS) cluster using AWS Fargate, behind an Application Load Balancer (ALB).
- **Amazon Aurora Serverless v2 (PostgreSQL)**: The application data is stored in an Amazon Aurora Serverless v2 (PostgreSQL) cluster, which provides a serverless, auto-scaling, and highly available relational database.
- **Amazon S3**: The assets (e.g., images, files) are stored in Amazon S3.
- **Amazon CloudFront**: The assets are cached and served through Amazon CloudFront, a global content delivery network (CDN).
- **AWS Certificate Manager**: SSL/TLS certificates for secure communication are managed by AWS Certificate Manager.
- **Amazon Route 53**: The application is accessible through a custom domain name managed by Amazon Route 53.
- **AWS Secrets Manager**: Sensitive configuration values, such as database credentials, are securely stored in AWS Secrets Manager.
- **AWS VPC**: The resources are deployed within an Amazon Virtual Private Cloud (VPC) for network isolation and security.

## Prerequisites

Before you can deploy this stack, ensure that you have the following prerequisites set up:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured with your AWS credentials.
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) installed and set up.
- [Docker](https://docs.docker.com/engine/install/) installed and running.

## Quick Start

1. Clone this repository to your local machine.
2. Install the required dependencies: `npm install`
3. If this is your first time using CDK, run `npx -w packages/cdk cdk bootstrap` to bootstrap cdk in your account.
4. Open the `packages/cdk/cdk.json` file and update the following context parameters:
   - `hostedZoneDomainName`: The domain name you want to use for your Strapi application (e.g., `example.com`).
   - `authorizedIPsForAdminAccess`: A list of IP addresses or CIDR ranges that should be allowed to access the Strapi admin panel separated by comma. (e.g., `111.111.111.111/24,222.222.222.222./24`)
6. Deploy the stack: `npm run cdk:deploy`

After the deployment is complete, you can access your Strapi application through the provided domain name. The Strapi admin panel will be accessible only from the authorized IP addresses specified in the `authorizedIPsForAdminAccess` parameter.

## Local Development

1. Run `npm run cms:build` to build docker image
2. Run `npm run cms:dev` to run local development environment.

## Contributing

Contributions to this project are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.
