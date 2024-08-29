import { aws_certificatemanager } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface CertificateProps {
  hostedZone: IHostedZone;
  domainName: string;
}

export class Certificate extends Construct {
  public readonly certificate: ICertificate;

  constructor(scope: Construct, id: string, props: CertificateProps) {
    super(scope, id);

    const { hostedZone, domainName } = props!;

    this.certificate = new aws_certificatemanager.Certificate(
      this,
      'Certificate',
      {
        domainName,
        validation:
          aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );
  }
}
