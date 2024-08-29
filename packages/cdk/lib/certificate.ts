import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Certificate } from './constructs/certificate';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

export interface CertificateStackProps extends StackProps {
  hostedZoneDomainName: string;
  domainName: string;
}

export class CertificateStack extends Stack {
  public readonly certificate: ICertificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const { hostedZoneDomainName, domainName } = props;

    // Constructs

    const hostedZone = HostedZone.fromLookup(this, 'hosted-zone', {
      domainName: hostedZoneDomainName,
    });

    const certificate = new Certificate(this, Certificate.name, {
      hostedZone,
      domainName,
    });

    this.certificate = certificate.certificate;
  }
}
