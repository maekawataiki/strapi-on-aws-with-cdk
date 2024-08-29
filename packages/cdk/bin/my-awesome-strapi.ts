#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { StrapiStack } from '../lib/strapi';
import { CertificateStack } from '../lib/certificate';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Context
const applicationName = app.node.tryGetContext('applicationName');
const hostedZoneDomainName = app.node.tryGetContext('hostedZoneDomainName');
const authorizedIPsForAdminAccess: string[] = app.node
  .tryGetContext('authorizedIPsForAdminAccess')
  .split(',');
const domainName = `${applicationName}.${hostedZoneDomainName}`;

// Stack

// Deployed to us-east-1 since CDN certificate must be issued in us-east-1
const certificateStack = new CertificateStack(app, CertificateStack.name, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  crossRegionReferences: true,
  hostedZoneDomainName,
  domainName,
});

new StrapiStack(app, StrapiStack.name, {
  env,
  crossRegionReferences: true,
  applicationName,
  domainName,
  hostedZoneDomainName,
  globalCertificate: certificateStack.certificate,
  authorizedIPsForAdminAccess,
});
